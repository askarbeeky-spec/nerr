#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SKY Internet - Unified Payment & Management API
Интегрированный API для управления платежами, сессиями и партнерской сетью
Адаптирован под ТЗ: MAC-авторизация, биллинг, PostgreSQL + FreeRADIUS
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import asyncio
import time
import logging
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import uuid
import json

load_dotenv()

# ============================================
# НАСТРОЙКИ
# ============================================

SERVER_PORT = int(os.getenv("API_PORT", "5000"))
AUTO_CONFIRM_DELAY = int(os.getenv("AUTO_CONFIRM_DELAY", "1"))

# Настройки PostgreSQL (база skybeer_wifi)
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "skybeer_wifi"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", ""),  # Задать в .env
}

# Настройки MikroTik (для принудительного отключения пользователей)
MIKROTIK_CONFIG = {
    "host": os.getenv("MIKROTIK_HOST", "192.168.88.1"),
    "user": os.getenv("MIKROTIK_USER", "admin"),
    "pass": os.getenv("MIKROTIK_PASS", ""),  # Задать в .env
    "secret": os.getenv("RADIUS_SECRET", "radius123"),
}

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# DATABASE HELPERS
# ============================================

def get_db():
    """Получить соединение с PostgreSQL с учетом правильного часового пояса Бишкека (+6)"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        # Принудительно устанавливаем часовой пояс для этой сессии
        with conn.cursor() as cur:
            cur.execute("SET TIME ZONE 'Asia/Bishkek'")
        return conn
    except Exception as e:
        logger.error(f"DB connection error: {e}")
        return None

def db_execute(query: str, params=None, fetch=False):
    """Выполнить запрос к БД"""
    conn = get_db()
    if not conn:
        return None
    try:
        with conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(query, params)
                if fetch:
                    return cur.fetchall()
                return True
    except Exception as e:
        logger.error(f"DB query error: {e}\nQuery: {query}")
        return None
    finally:
        conn.close()

# ============================================
# RADIUS INTEGRATION
# ============================================

def radius_grant_access(mac_address: str, tariff_group: str, session_timeout: int):
    """
    Выдать доступ устройству через FreeRADIUS.
    Session-Timeout вычисляется динамически через SQL из billing_sessions.expires_at
    чтобы MikroTik всегда знал точное время окончания и сам отключил пользователя вовремя.
    """
    mac = mac_address.lower()

    # 1. Добавляем/обновляем запись в radcheck (Auth-Type = Accept)
    db_execute("""
        INSERT INTO radcheck (username, attribute, op, value)
        VALUES (%s, 'Auth-Type', ':=', 'Accept')
        ON CONFLICT DO NOTHING
    """, (mac,))

    # 2. УБИРАЕМ фиксированный Session-Timeout из radreply.
    # Теперь он считается динамически через authorize_reply_query в mods-enabled/sql:
    # EXTRACT(EPOCH FROM (billing_sessions.expires_at - NOW()))
    # Благодаря этому, при каждой авторизации MikroTik получает точные секунды до конца оплаты.
    db_execute("DELETE FROM radreply WHERE username = %s AND attribute = 'Session-Timeout'", (mac,))

    # 3. Назначаем тарифную группу (для скоростей: Mikrotik-Rate-Limit)
    db_execute("DELETE FROM radusergroup WHERE username = %s", (mac,))
    db_execute("""
        INSERT INTO radusergroup (username, groupname, priority)
        VALUES (%s, %s, 1)
    """, (mac, tariff_group))
def mikrotik_ssh_cleanup_bulk(macs: list):
    """Подключается к MikroTik по SSH и чистит active/cookie/host для списка MAC (оптимизировано под N юзеров)"""
    if not macs:
        return
    try:
        import paramiko
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        pwd = MIKROTIK_CONFIG["pass"]
        logger.info(f"⏳ Connecting to SSH {MIKROTIK_CONFIG['user']}@{MIKROTIK_CONFIG['host']} to clean {len(macs)} MACs...")
        
        ssh.connect(
            hostname=MIKROTIK_CONFIG["host"],
            username=MIKROTIK_CONFIG["user"],
            password=pwd,
            timeout=10,
            look_for_keys=False,
            allow_agent=False
        )
        
        commands = []
        for mac in macs:
            mac_upper = mac.upper()
            commands.extend([
                f'/ip hotspot active remove [find mac-address="{mac_upper}"]',
                f'/ip hotspot cookie remove [find mac-address="{mac_upper}"]',
                f'/ip hotspot host remove [find mac-address="{mac_upper}"]'
            ])
            
        full_cmd = ";".join(commands)
        stdin, stdout, stderr = ssh.exec_command(full_cmd)
        stdout.channel.recv_exit_status()  # ждём выполнения
        ssh.close()
        logger.info(f"⚡ SSH: mass cleanup completed for {len(macs)} devices.")
    except Exception as e:
        logger.error(f"❌ SSH bulk cleanup failed: {e}")

def radius_revoke_access_bulk(mac_list: list):
    """Отозвать доступ и мгновенно выкинуть группу MAC-адресов (RADIUS + SSH)"""
    if not mac_list: return
    import subprocess
    import threading

    macs_lower = [mac.lower() for mac in mac_list]
    macs_upper = [mac.upper() for mac in mac_list]

    # 1. Удаляем из RADIUS таблиц
    for mac in macs_lower:
        db_execute("DELETE FROM radcheck WHERE username = %s", (mac,))
        db_execute("DELETE FROM radreply WHERE username = %s", (mac,))
        db_execute("DELETE FROM radusergroup WHERE username = %s", (mac,))
        
        # 2. Помечаем сессию как disconnected
        db_execute("""
            UPDATE billing_sessions SET status='disconnected'
            WHERE LOWER(mac_address) = %s AND status='active'
        """, (mac,))

    logger.info(f"🚫 RADIUS DB revoked for {len(mac_list)} devices.")

    # 3. Отправляем PoD пакеты
    try:
        cmds = []
        for mac_upper in macs_upper:
            pod_data = f"User-Name={mac_upper},Calling-Station-Id={mac_upper}"
            cmds.append(f'echo "{pod_data}" | radclient -x {MIKROTIK_CONFIG["host"]}:3799 disconnect {MIKROTIK_CONFIG["secret"]}')
            
        full_pod = "; ".join(cmds)
        cmd_radius = ['docker', 'exec', 'radius-server', 'sh', '-c', full_pod]
        subprocess.Popen(cmd_radius, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        logger.info(f"🚀 RADIUS PoD signal sent for {len(mac_list)} devices.")
    except Exception as e:
        logger.error(f"❌ Failed to send RADIUS PoD: {e}")

    # 4. Один SSH поток на всех
    threading.Thread(target=mikrotik_ssh_cleanup_bulk, args=(macs_lower,), daemon=True).start()

def radius_revoke_access(mac_address: str):
    """Обертка для обратной совместимости вызовов одного пользователя"""
    radius_revoke_access_bulk([mac_address])

# ============================================
# DEMO DATA INIT
# ============================================

def init_demo_data():
    """Создание демо-данных для тестирования"""
    logger.info("🎭 Initializing demo data...")

    # Проверяем/создаем точку доступа в БД
    db_execute("""
        INSERT INTO access_points (nas_ip, name, location)
        VALUES ('192.168.88.1', 'MikroTik Main - Склон А', 'Каракол, база Тоо-Ашуу')
        ON CONFLICT (nas_ip) DO NOTHING
    """)

    logger.info("✅ Demo data initialized")

# In-memory для партнеров (ЭТАП 2 перенесем в БД)
partners_storage = {}
routers_storage = {}

def cleanup_expired_sessions():
    """
    БОЕВАЯ ФУНКЦИЯ: Удаляет из RADIUS таблиц MAC-адреса у которых истекла сессия.
    Гарантирует что Access-Reject придёт даже если asyncio.sleep не сработал.
    Запускается периодически через periodic_cleanup_task.
    """
    try:
        # Находим MAC которые есть в radcheck, но их сессия истекла
        expired = db_execute("""
            SELECT DISTINCT rc.username as mac
            FROM radcheck rc
            LEFT JOIN billing_sessions bs
                ON LOWER(bs.mac_address) = LOWER(rc.username)
                AND bs.status = 'active'
                AND bs.expires_at > NOW()
            WHERE bs.id IS NULL
        """, fetch=True)

        if expired:
            mac_list = [row['mac'] for row in expired]
            logger.info(f"🧹 Periodic cleanup: revoking {len(mac_list)} expired MACs simultaneously")
            radius_revoke_access_bulk(mac_list)

        # Помечаем истёкшие billing_sessions как expired
        db_execute("""
            UPDATE billing_sessions SET status='expired'
            WHERE status='active' AND expires_at <= NOW()
        """)
    except Exception as e:
        logger.error(f"Cleanup error: {e}")


async def periodic_cleanup_task():
    """Фоновая задача: каждые 10 секунд чистим истёкшие сессии"""
    while True:
        await asyncio.sleep(10)
        cleanup_expired_sessions()


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Lifespan context manager"""
    # Startup
    init_demo_data()

    # Демо партнер
    partners_storage["partner_demo_001"] = {
        "id": "partner_demo_001",
        "name": "Demo Partner (Горнолыжная база)",
        "email": "demo@skyinternet.kg",
        "phone": "+996555123456",
        "commission_percent": 30.0,
        "total_earned": 0.0,
        "registered_at": datetime.now().isoformat(),
        "routers": ["router_demo_001"]
    }
    routers_storage["router_demo_001"] = {
        "id": "router_demo_001",
        "name": "Demo Router - Склон А",
        "location": "Каракол, база Тоо-Ашуу",
        "partner_id": "partner_demo_001",
        "ip_address": "192.168.88.1",
        "status": "active",
        "registered_at": datetime.now().isoformat(),
        "last_seen": datetime.now().isoformat(),
        "total_revenue": 0.0,
        "total_sessions": 0
    }

    # Запускаем периодический cleanup
    cleanup_task = asyncio.create_task(periodic_cleanup_task())
    logger.info("🚀 SKY Internet API started (cleanup task running every 60s)")
    yield
    cleanup_task.cancel()
    logger.info("👋 SKY Internet API shutting down")

# ============================================
# CREATE FASTAPI APP
# ============================================

app = FastAPI(
    title="SKY Internet API",
    description="Unified API для captive portal, биллинга и партнерской сети (ТЗ MVP)",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# ТАРИФЫ (по ТЗ: Час / Сутки + кастомные)
# ============================================

TARIFFS = {
    "hour": {
        "name": "1 час",
        "duration_minutes": 60,
        "session_timeout": 3600,
        "radius_group": "tariff_1hour",
        "price": 50,
        "speed_down": 5,  # Mbps
        "speed_up": 2,
    },
    "day": {
        "name": "1 сутки",
        "duration_minutes": 1440,
        "session_timeout": 86400,
        "radius_group": "tariff_1day",
        "price": 150,
        "speed_down": 10,
        "speed_up": 5,
    },
    "custom": {
        "name": "Свой тариф",
        "radius_group": "tariff_1hour",  # базовая группа
    }
}

# ============================================
# PYDANTIC MODELS
# ============================================

class PaymentProcessRequest(BaseModel):
    mac_address: str
    router_id: str
    tariff_type: str       # hour, day, custom
    tariff_name: str
    price: float
    duration_minutes: int
    payment_method: str    # card, mbank, odengi

class SessionCheckRequest(BaseModel):
    mac_address: str
    router_id: str

class RouterRegistration(BaseModel):
    router_id: str
    name: str
    location: str
    partner_id: str
    ip_address: Optional[str] = None

class PartnerRegistration(BaseModel):
    name: str
    email: str
    phone: str
    commission_percent: float = 30.0

# ============================================
# UTILITY FUNCTIONS
# ============================================

def generate_id(prefix=""):
    return f"{prefix}{uuid.uuid4()}" if prefix else str(uuid.uuid4())

def normalize_mac(mac: str) -> str:
    """Нормализуем MAC в нижний регистр с двоеточиями"""
    mac = mac.lower().replace("-", ":").replace(".", ":")
    # Убираем лишние символы
    parts = mac.split(":")
    if len(parts) == 1 and len(mac) == 12:
        # Без разделителей: aabbccddeeff → aa:bb:cc:dd:ee:ff
        mac = ":".join(mac[i:i+2] for i in range(0, 12, 2))
    return mac

def get_tariff_group(tariff_type: str, duration_minutes: int) -> str:
    """Определяем тарифную группу RADIUS"""
    if tariff_type in TARIFFS and "radius_group" in TARIFFS[tariff_type]:
        return TARIFFS[tariff_type]["radius_group"]
    # Для кастомного тарифа выбираем группу по длительности
    if duration_minutes <= 60:
        return "tariff_1hour"
    else:
        return "tariff_1day"

# ============================================
# CAPTIVE PORTAL ENDPOINTS
# ============================================

@app.post("/api/process-payment")
async def process_payment(req: PaymentProcessRequest, background_tasks: BackgroundTasks):
    """
    Обработка платежа от captive portal (ТЗ: Сценарий «Турист»)

    1. Создает транзакцию в БД
    2. Подтверждает платеж (фейковый режим / реальный шлюз)
    3. Выдает доступ через FreeRADIUS (MAC → radcheck)
    4. Начисляет комиссию партнеру
    """
    mac = normalize_mac(req.mac_address)
    logger.info(f"💳 New payment: {mac} - {req.tariff_name} - {req.price} сом")

    # 1. Проверяем наличие активной сессии для суммирования времени
    current_session = db_execute("""
        SELECT expires_at FROM billing_sessions
        WHERE mac_address = %s AND status = 'active' AND expires_at > NOW()
        ORDER BY expires_at DESC LIMIT 1
    """, (mac,), fetch=True)

    start_time = datetime.now()
    if current_session:
        last_expires = current_session[0]['expires_at']
        # Приводим к naive datetime для сравнения, если база вернула с таймзоной
        if last_expires.tzinfo:
            last_expires = last_expires.replace(tzinfo=None)
            
        if last_expires > start_time:
            start_time = last_expires
            logger.info(f"🔄 Extending session for {mac}. New start time: {start_time}")

    # Создаем транзакцию в billing_sessions
    session_id = generate_id("sess_")
    expires_at = start_time + timedelta(minutes=req.duration_minutes)
    
    # Вычисляем таймаут для Radius (секунды от текущего момента до конца)
    total_seconds_left = (expires_at - datetime.now()).total_seconds()
    session_timeout = int(total_seconds_left)
    
    # Определяем NAS IP из роутера
    nas_ip = "192.168.88.1"
    if req.router_id in routers_storage:
        nas_ip = routers_storage[req.router_id].get("ip_address", "192.168.88.1")

    # Сохраняем в billing_sessions
    db_execute("""
        INSERT INTO billing_sessions
            (mac_address, tariff_name, amount, currency, payment_method,
             payment_id, status, expires_at, nas_ip, location_name)
        VALUES (%s, %s, %s, 'KGS', %s, %s, 'active', %s, %s, %s)
    """, (
        mac, req.tariff_name, req.price, req.payment_method,
        session_id, expires_at, nas_ip,
        routers_storage.get(req.router_id, {}).get("location", "")
    ))

    # 2. Выдаем доступ через FreeRADIUS
    tariff_group = get_tariff_group(req.tariff_type, req.duration_minutes)
    radius_grant_access(mac, tariff_group, session_timeout)

    # 3. Обновляем статистику роутера
    if req.router_id in routers_storage:
        routers_storage[req.router_id]["total_sessions"] += 1
        routers_storage[req.router_id]["total_revenue"] += req.price
        routers_storage[req.router_id]["last_seen"] = datetime.now().isoformat()

    # 4. Начисляем комиссию партнеру (фоновая задача)
    background_tasks.add_task(calculate_partner_commission, req.router_id, req.price, session_id)

    # 5. Планируем отзыв доступа после истечения (фоновая задача)
    background_tasks.add_task(schedule_access_revoke, mac, session_timeout)

    logger.info(f"✅ Session created: {session_id} (expires: {expires_at})")

    return {
        "status": "success",
        "message": "Оплата прошла успешно! Интернет активирован.",
        "session_id": session_id,
        "mac_address": mac,
        "tariff_name": req.tariff_name,
        "price": req.price,
        "duration_minutes": req.duration_minutes,
        "created_at": datetime.now().isoformat(),
        "expires_at": expires_at.isoformat()
    }

@app.post("/api/check-session")
async def check_session(req: SessionCheckRequest):
    """
    Проверка активной сессии по MAC-адресу.
    ТЗ: «С возвращением!» — показываем остаток времени.
    """
    mac = normalize_mac(req.mac_address)
    logger.info(f"🔍 Checking session: {mac}")

    # Ищем активную сессию в БД
    rows = db_execute("""
        SELECT id, mac_address, tariff_name, amount, expires_at, created_at
        FROM billing_sessions
        WHERE mac_address = %s
          AND status = 'active'
          AND expires_at > NOW()
        ORDER BY expires_at DESC
        LIMIT 1
    """, (mac,), fetch=True)

    if rows:
        session = rows[0]
        expires_at = session["expires_at"]
        
        # Ensure we have a valid datetime object
        if not isinstance(expires_at, datetime):
            logger.error(f"Invalid expires_at type: {type(expires_at)}")
            return {"active_session": False}

        # Handle timezone info if present (make it naive for simple subtraction)
        if expires_at.tzinfo:
            expires_at = expires_at.replace(tzinfo=None)
            
        now = datetime.now()
        
        # Calculate remaining minutes
        diff = expires_at - now
        minutes_left = int(diff.total_seconds() / 60)

        # Ensure we don't return negative for active sessions (just in case of race condition)
        if minutes_left < 0:
            minutes_left = 0

        logger.info(f"✅ Active session found for {mac}. Expires: {expires_at}, Minutes left: {minutes_left}")
        
        return {
            "active_session": True,
            "minutes_left": minutes_left,
            "session_id": str(session["id"]),
            "tariff_name": session["tariff_name"],
            "created_at": session["created_at"].isoformat() if hasattr(session["created_at"], 'isoformat') else str(session["created_at"]),
            "expires_at": expires_at.isoformat()
        }

    logger.info(f"❌ No active session for {mac}")
    return {"active_session": False}

@app.post("/api/check-session-by-ip")
async def check_session_by_ip(request: Request):
    """
    Найти MAC пользователя по его IP адресу через таблицу radacct.
    Используется когда MAC недоступен в URL (прямой заход на /portal/).
    """
    body = await request.json()
    client_ip = body.get("client_ip") or request.client.host

    logger.info(f"🔍 Looking up session by IP: {client_ip}")

    # Ищем MAC в radacct по IP адресу клиента
    # DISTINCT + ORDER BY требует acctstarttime в SELECT в PostgreSQL
    rows = db_execute("""
        SELECT callingstationid as mac, MAX(acctstarttime) as last_start
        FROM radacct
        WHERE framedipaddress = %s
          AND acctstoptime IS NULL
        GROUP BY callingstationid
        ORDER BY last_start DESC
        LIMIT 1
    """, (client_ip,), fetch=True)

    if rows:
        mac = normalize_mac(rows[0]["mac"])
        logger.info(f"✅ Found MAC by IP {client_ip}: {mac}")

        # Теперь проверяем активную сессию
        session_rows = db_execute("""
            SELECT id, mac_address, tariff_name, amount, expires_at, created_at
            FROM billing_sessions
            WHERE mac_address = %s AND status = 'active' AND expires_at > NOW()
            ORDER BY expires_at DESC LIMIT 1
        """, (mac,), fetch=True)

        if session_rows:
            s = session_rows[0]
            expires = s["expires_at"]
            return {
                "active_session": True,
                "mac": mac,
                "tariff_name": s["tariff_name"],
                "expires_at": expires.isoformat() if hasattr(expires, 'isoformat') else str(expires),
                "created_at": s["created_at"].isoformat() if hasattr(s["created_at"], 'isoformat') else str(s["created_at"])
            }
        return {"active_session": False, "mac": mac, "note": "MAC found but no active session"}

    logger.info(f"❌ No MAC found for IP: {client_ip}")
    return {"active_session": False, "mac": None}



@app.get("/api/sessions/active")
def get_active_sessions(router_id: Optional[str] = None):
    """Получить все активные сессии"""
    rows = db_execute("""
        SELECT id, mac_address, tariff_name, amount, nas_ip, expires_at, created_at
        FROM billing_sessions
        WHERE status = 'active' AND expires_at > NOW()
        ORDER BY created_at DESC
    """, fetch=True)

    sessions = []
    if rows:
        for r in rows:
            sessions.append({
                "session_id": str(r["id"]),
                "mac_address": r["mac_address"],
                "tariff_name": r["tariff_name"],
                "price": float(r["amount"]),
                "nas_ip": r["nas_ip"],
                "expires_at": r["expires_at"].isoformat() if hasattr(r["expires_at"], 'isoformat') else str(r["expires_at"]),
                "created_at": r["created_at"].isoformat() if hasattr(r["created_at"], 'isoformat') else str(r["created_at"]),
            })

    return {
        "status": "success",
        "count": len(sessions),
        "sessions": sessions
    }

# ============================================
# PARTNER DASHBOARD ENDPOINTS
# ============================================

@app.post("/api/partner/register")
def register_partner(req: PartnerRegistration):
    """Регистрация нового партнера"""
    partner_id = generate_id("partner_")
    partners_storage[partner_id] = {
        "id": partner_id,
        "name": req.name,
        "email": req.email,
        "phone": req.phone,
        "commission_percent": req.commission_percent,
        "total_earned": 0.0,
        "registered_at": datetime.now().isoformat(),
        "routers": []
    }
    logger.info(f"👤 Partner registered: {partner_id} - {req.name}")
    return {"status": "success", "partner_id": partner_id}

@app.post("/api/partner/router/register")
def register_router(req: RouterRegistration):
    """Регистрация нового роутера (точки доступа)"""
    if req.partner_id not in partners_storage:
        raise HTTPException(status_code=404, detail="Партнер не найден")

    routers_storage[req.router_id] = {
        "id": req.router_id,
        "name": req.name,
        "location": req.location,
        "partner_id": req.partner_id,
        "ip_address": req.ip_address,
        "status": "active",
        "registered_at": datetime.now().isoformat(),
        "last_seen": datetime.now().isoformat(),
        "total_revenue": 0.0,
        "total_sessions": 0
    }
    partners_storage[req.partner_id]["routers"].append(req.router_id)

    # Добавляем в БД
    if req.ip_address:
        db_execute("""
            INSERT INTO access_points (nas_ip, name, location)
            VALUES (%s, %s, %s)
            ON CONFLICT (nas_ip) DO UPDATE SET name=%s, location=%s
        """, (req.ip_address, req.name, req.location, req.name, req.location))

    logger.info(f"📡 Router registered: {req.router_id} - {req.name}")
    return {"status": "success", "router_id": req.router_id}

@app.get("/api/partner/{partner_id}/stats")
def get_partner_stats(partner_id: str, days: int = 30):
    """Статистика партнера (ТЗ: Личный кабинет)"""
    if partner_id not in partners_storage:
        raise HTTPException(status_code=404, detail="Партнер не найден")

    partner = partners_storage[partner_id]
    router_ips = [
        routers_storage[rid].get("ip_address")
        for rid in partner["routers"]
        if rid in routers_storage
    ]

    # Статистика из БД
    total_revenue = 0.0
    total_sessions = 0
    active_sessions = 0

    if router_ips:
        rows = db_execute("""
            SELECT
                COUNT(*) as total,
                COALESCE(SUM(amount), 0) as revenue,
                COUNT(CASE WHEN status='active' AND expires_at > NOW() THEN 1 END) as active
            FROM billing_sessions
            WHERE nas_ip = ANY(%s)
              AND created_at > NOW() - INTERVAL '30 days'
        """, (router_ips,), fetch=True)

        if rows:
            total_sessions = rows[0]["total"] or 0
            total_revenue = float(rows[0]["revenue"] or 0)
            active_sessions = rows[0]["active"] or 0

    commission = total_revenue * (partner["commission_percent"] / 100)

    # Последние транзакции
    recent_rows = db_execute("""
        SELECT mac_address, tariff_name, amount as price, payment_method,
               nas_ip as router_id, status, created_at, expires_at
        FROM billing_sessions
        WHERE nas_ip = ANY(%s)
        ORDER BY created_at DESC
        LIMIT 20
    """, (router_ips if router_ips else [''],), fetch=True)

    recent_transactions = []
    if recent_rows:
        for r in recent_rows:
            recent_transactions.append({
                "mac_address": r["mac_address"],
                "tariff_name": r["tariff_name"],
                "price": float(r["price"]),
                "payment_method": r["payment_method"],
                "router_id": r["router_id"],
                "status": r["status"],
                "created_at": r["created_at"].isoformat() if hasattr(r["created_at"], 'isoformat') else str(r["created_at"]),
                "expires_at": r["expires_at"].isoformat() if r["expires_at"] and hasattr(r["expires_at"], 'isoformat') else str(r["expires_at"]) if r["expires_at"] else None,
            })

    return {
        "status": "success",
        "partner": {
            "id": partner_id,
            "name": partner["name"],
            "commission_percent": partner["commission_percent"]
        },
        "stats": {
            "total_routers": len(partner["routers"]),
            "active_sessions": active_sessions,
            "total_sessions": total_sessions,
            "total_revenue": round(total_revenue, 2),
            "partner_commission": round(commission, 2)
        },
        "recent_transactions": recent_transactions
    }

@app.get("/api/partner/{partner_id}/routers")
def get_partner_routers(partner_id: str):
    """Список роутеров партнера"""
    if partner_id not in partners_storage:
        raise HTTPException(status_code=404, detail="Партнер не найден")

    partner = partners_storage[partner_id]
    routers = [routers_storage[rid] for rid in partner["routers"] if rid in routers_storage]
    return {"status": "success", "count": len(routers), "routers": routers}

@app.post("/api/partner/session-created")
async def partner_session_notification(data: dict):
    """Webhook уведомление о новой сессии"""
    router_id = data.get("router_id")
    if router_id in routers_storage:
        routers_storage[router_id]["total_sessions"] += 1
        routers_storage[router_id]["total_revenue"] += data.get("price", 0)
        routers_storage[router_id]["last_seen"] = datetime.now().isoformat()
    return {"status": "success"}

# ============================================
# ROUTER MONITORING (ТЗ: Мониторинг Online/Offline)
# ============================================

@app.get("/api/routers/status")
def get_routers_status():
    """Статус всех точек доступа"""
    rows = db_execute("""
        SELECT nas_ip, name, location, status, last_seen
        FROM access_points
        ORDER BY name
    """, fetch=True)

    result = []
    if rows:
        for r in rows:
            last_seen = r["last_seen"]
            if last_seen:
                minutes_ago = (datetime.now(last_seen.tzinfo) - last_seen).total_seconds() / 60
                status = "online" if minutes_ago < 10 else "offline"
            else:
                minutes_ago = 999
                status = "unknown"

            result.append({
                "nas_ip": r["nas_ip"],
                "name": r["name"],
                "location": r["location"],
                "status": status,
                "last_seen_minutes_ago": round(minutes_ago, 1)
            })

    return {"status": "success", "count": len(result), "routers": result}

@app.post("/api/router/{router_id}/heartbeat")
def router_heartbeat(router_id: str):
    """Heartbeat от роутера"""
    if router_id in routers_storage:
        routers_storage[router_id]["last_seen"] = datetime.now().isoformat()
        nas_ip = routers_storage[router_id].get("ip_address")
        if nas_ip:
            db_execute("""
                UPDATE access_points SET status='online', last_seen=NOW()
                WHERE nas_ip=%s
            """, (nas_ip,))
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Router not found")

# ============================================
# HELPER FUNCTIONS
# ============================================

async def calculate_partner_commission(router_id: str, amount: float, session_id: str):
    """Начисление комиссии партнеру"""
    if router_id not in routers_storage:
        return
    router = routers_storage[router_id]
    partner_id = router["partner_id"]
    if partner_id not in partners_storage:
        return
    partner = partners_storage[partner_id]
    commission = amount * (partner["commission_percent"] / 100)
    partners_storage[partner_id]["total_earned"] += commission
    logger.info(f"💰 Commission: {commission:.2f} сом → Partner {partner_id}")

async def schedule_access_revoke(mac: str, delay_seconds: int):
    """Отозвать доступ после истечения сессии"""
    try:
        await asyncio.sleep(delay_seconds)
        
        # Проверяем, есть ли более новые активные сессии
        rows = db_execute("""
            SELECT expires_at FROM billing_sessions
            WHERE mac_address = %s AND status = 'active' AND expires_at > NOW()
            ORDER BY expires_at DESC LIMIT 1
        """, (mac,), fetch=True)
        
        if rows:
            logger.info(f"⏩ Revoke skipped for {mac}: found active extension until {rows[0]['expires_at']}")
            return

        radius_revoke_access(mac)
        # Помечаем сессию как истекшую
        db_execute("""
            UPDATE billing_sessions SET status='expired'
            WHERE mac_address=%s AND status='active' AND expires_at <= NOW()
        """, (mac,))
    except Exception as e:
        logger.error(f"Error in revoke task for {mac}: {e}")

# ============================================
# RADIUS ADMIN ENDPOINTS
# ============================================

@app.get("/api/admin/radius/users")
@app.get("/api/admin/radius/users")
def get_radius_users():
    """Список всех MAC-адресов с доступом в RADIUS (консолидированный вид)"""
    # Используем CTE или подзапрос для получения последних активных сессий
    rows = db_execute("""
        WITH active_sessions AS (
            SELECT mac_address, 
                   MAX(expires_at) as max_expires, 
                   SUM(amount) as total_amount,
                   STRING_AGG(DISTINCT tariff_name, ', ') as tariffs
            FROM billing_sessions
            WHERE status = 'active' AND expires_at > NOW()
            GROUP BY mac_address
        )
        SELECT rc.username as mac, rc.attribute, rc.value,
               s.tariffs as tariff_name, s.total_amount as amount, s.max_expires as expires_at,
               CASE WHEN s.mac_address IS NOT NULL THEN 'active' ELSE 'no_session' END as status,
               rr.value as session_timeout
        FROM radcheck rc
        LEFT JOIN active_sessions s ON s.mac_address = rc.username
        LEFT JOIN radreply rr ON rr.username = rc.username
            AND rr.attribute = 'Session-Timeout'
        ORDER BY rc.username
    """, fetch=True)

    users = []
    if rows:
        seen = set()
        for r in rows:
            mac = r["mac"]
            if mac in seen:
                continue
            seen.add(mac)
            expires = r["expires_at"]
            
            # Если expires_at есть, вычисляем session_timeout динамически для верности
            current_timeout = r["session_timeout"]
            if expires:
                if expires.tzinfo:
                    expires = expires.replace(tzinfo=None)
                seconds_left = int((expires - datetime.now()).total_seconds())
                if seconds_left > 0:
                    current_timeout = str(seconds_left)
            
            users.append({
                "mac": mac,
                "has_access": r["attribute"] == "Auth-Type",
                "tariff_name": r["tariff_name"] or "Неизвестно",
                "amount": float(r["amount"]) if r["amount"] else 0,
                "session_timeout": current_timeout,
                "expires_at": expires.isoformat() if expires else None,
                "billing_status": r["status"]
            })

    return {"status": "success", "count": len(users), "users": users}

class ModifyTimeRequest(BaseModel):
    mac_address: str
    minutes: int

@app.post("/api/admin/radius/modify_time")
def admin_modify_session_time(req: ModifyTimeRequest):
    """Изменить время активной сессии (добавить или убавить минуты)"""
    mac = normalize_mac(req.mac_address)
    
    # 1. Ищем активную сессию
    rows = db_execute("""
        SELECT id, expires_at 
        FROM billing_sessions 
        WHERE mac_address = %s AND status = 'active'
        ORDER BY expires_at DESC LIMIT 1
    """, (mac,), fetch=True)
    
    if not rows:
        raise HTTPException(status_code=404, detail="Активная сессия не найдена")
    
    current_expires = rows[0]["expires_at"]
    if hasattr(current_expires, "tzinfo") and current_expires.tzinfo:
        current_expires = current_expires.replace(tzinfo=None)
        
    start_time = datetime.now()
    # Если сессия уже истекла, считаем от сейчас (восстановление)
    if current_expires < start_time:
        current_expires = start_time
        
    # 2. Вычисляем новое время
    new_expires = current_expires + timedelta(minutes=req.minutes)
    
    # Если время меньше текущего - завершаем сессию
    if new_expires <= datetime.now():
        radius_revoke_access(mac)
        db_execute("""
            UPDATE billing_sessions SET status='expired_admin', expires_at=%s 
            WHERE id=%s
        """, (new_expires, rows[0]["id"]))
        return {"status": "success", "message": f"Сессия завершена (время истекло). MAC: {mac}"}
    
    # 3. Обновляем сессию в БД
    db_execute("""
        UPDATE billing_sessions SET expires_at=%s 
        WHERE id=%s
    """, (new_expires, rows[0]["id"]))
    
    # 4. Обновляем Session-Timeout в FreeRADIUS
    seconds_left = int((new_expires - datetime.now()).total_seconds())
    
    # Если сессия была в архиве - восстанавливаем доступ
    # Просто вызываем grant с новой длительностью, он обновит radcheck/radreply
    # Но нам нужна тарифная группа...
    # Проще просто обновить таймаут, если доступ есть.
    
    # Проверяем, есть ли доступ в radcheck
    check = db_execute("SELECT username FROM radcheck WHERE username=%s", (mac,), fetch=True)
    if not check:
        # Если доступа нет (сессия истекла), нужно восстановить полностью
        # Берем тариф из сессии или дефолт
        tariff_group = "tariff_1hour" # fallback
        radius_grant_access(mac, tariff_group, seconds_left)
    else:
        # Просто обновляем таймаут
        db_execute("DELETE FROM radreply WHERE username = %s AND attribute = 'Session-Timeout'", (mac,))
        db_execute("""
            INSERT INTO radreply (username, attribute, op, value)
            VALUES (%s, 'Session-Timeout', ':=', %s)
        """, (mac, str(seconds_left)))
    
    logger.info(f"⏳ Admin modified time for {mac}: {req.minutes} min. New expires: {new_expires}")
    
    return {
        "status": "success", 
        "message": f"Время обновлено: {req.minutes} мин. (Всего осталось: {int(seconds_left/60)} мин)",
        "new_expires": new_expires.isoformat()
    }

class ManualGrantRequest(BaseModel):
    mac_address: str
    duration_minutes: int = 60
    tariff_type: str = "hour"

@app.post("/api/admin/radius/grant")
def admin_grant_access(req: ManualGrantRequest):
    """Вручную выдать доступ по MAC (без оплаты — для тестов и поддержки)"""
    mac = normalize_mac(req.mac_address)
    session_timeout = req.duration_minutes * 60
    tariff_group = get_tariff_group(req.tariff_type, req.duration_minutes)
    radius_grant_access(mac, tariff_group, session_timeout)
    logger.info(f"🔑 Admin manually granted access: {mac} for {req.duration_minutes} min")
    return {
        "status": "success",
        "message": f"Доступ выдан: {mac} на {req.duration_minutes} мин",
        "mac": mac,
        "tariff_group": tariff_group
    }

@app.delete("/api/admin/radius/revoke/{mac}")
def admin_revoke_access(mac: str):
    """Вручную отозвать доступ по MAC"""
    mac_normalized = normalize_mac(mac)
    radius_revoke_access(mac_normalized)
    # Помечаем сессию как отменённую
    db_execute("""
        UPDATE billing_sessions SET status='revoked'
        WHERE mac_address=%s AND status='active'
    """, (mac_normalized,))
    logger.info(f"🚫 Admin revoked access: {mac_normalized}")
    return {"status": "success", "message": f"Доступ отозван: {mac_normalized}"}

@app.get("/api/admin/radius/stats")
def get_radius_stats():
    """Статистика RADIUS — количество пользователей, активные сессии"""
    total_users = db_execute("SELECT COUNT(DISTINCT username) as cnt FROM radcheck", fetch=True)
    active_sessions = db_execute("""
        SELECT COUNT(*) as cnt FROM billing_sessions
        WHERE status='active' AND expires_at > NOW()
    """, fetch=True)
    today_revenue = db_execute("""
        SELECT COALESCE(SUM(amount), 0) as total FROM billing_sessions
        WHERE created_at > NOW() - INTERVAL '24 hours'
    """, fetch=True)

    return {
        "total_radius_users": total_users[0]["cnt"] if total_users else 0,
        "active_sessions": active_sessions[0]["cnt"] if active_sessions else 0,
        "today_revenue": float(today_revenue[0]["total"]) if today_revenue else 0,
    }

@app.post("/api/admin/mikrotik/disconnect/{mac}")
def disconnect_mikrotik_user(mac: str):
    """
    Отключить пользователя от MikroTik немедленно.
    Вызывает централизованный метод отзыва доступа.
    """
    mac_normalized = normalize_mac(mac)
    radius_revoke_access(mac_normalized)
    
    db_execute("""
        UPDATE billing_sessions SET status='disconnected'
        WHERE mac_address=%s AND status='active'
    """, (mac_normalized,))

    return {
        "status": "success",
        "message": f"Пользователь {mac_normalized} успешно отключен"
    }

# ============================================
# SYSTEM ENDPOINTS
# ============================================

@app.get("/")
def get_status():
    """Статус API"""
    rows = db_execute("""
        SELECT COUNT(*) as cnt FROM billing_sessions
        WHERE status='active' AND expires_at > NOW()
    """, fetch=True)
    active_count = rows[0]["cnt"] if rows else 0

    return {
        "name": "SKY Internet Unified API",
        "version": "2.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "client_portal": "http://192.168.88.254:5000/portal",
            "admin_dashboard": "http://192.168.88.254:5000/admin",
            "api_docs": "http://192.168.88.254:5000/docs"
        },
        "stats": {
            "active_sessions": active_count,
            "registered_routers": len(routers_storage),
            "registered_partners": len(partners_storage)
        }
    }

# Путь к фронтендам
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FAILS_DIR = os.path.dirname(BASE_DIR)  # папка "fails MikroTik"
CLIENT_DIR = os.path.join(FAILS_DIR, "client chast")
ADMIN_DIR = os.path.join(FAILS_DIR, "admin front")

logger.info(f"📁 BASE_DIR: {BASE_DIR}")
logger.info(f"📁 CLIENT_DIR: {CLIENT_DIR} (exists: {os.path.exists(CLIENT_DIR)})")
logger.info(f"📁 ADMIN_DIR: {ADMIN_DIR} (exists: {os.path.exists(ADMIN_DIR)})")

# Раздаём статические файлы (CSS, JS, изображения)
# Важно: mount должнен быть ПОСЛЕ всех API роутов!
if os.path.exists(CLIENT_DIR):
    app.mount("/portal", StaticFiles(directory=CLIENT_DIR, html=True), name="client_portal")
    logger.info(f"✅ Client portal mounted at /portal -> {CLIENT_DIR}")
else:
    logger.warning(f"⚠️ Client dir not found: {CLIENT_DIR}")

if os.path.exists(ADMIN_DIR):
    app.mount("/admin", StaticFiles(directory=ADMIN_DIR, html=True), name="admin_dashboard")
    logger.info(f"✅ Admin dashboard mounted at /admin -> {ADMIN_DIR}")
else:
    logger.warning(f"⚠️ Admin dir not found: {ADMIN_DIR}")

@app.get("/health")
def health_check():
    """Health check + проверка БД"""
    db_ok = db_execute("SELECT 1", fetch=True) is not None
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "timestamp": datetime.now().isoformat()
    }

# ============================================
# ЗАПУСК СЕРВЕРА
# ============================================

if __name__ == "__main__":
    import uvicorn
    import asyncio

    logger.info("="*60)
    logger.info("🚀 SKY Internet Unified API Server")
    logger.info("="*60)
    logger.info(f"Port: {SERVER_PORT}")
    logger.info(f"DB: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    logger.info("="*60)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=SERVER_PORT,
        log_level="info"
    )
