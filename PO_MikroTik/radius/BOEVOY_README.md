# 🎯 БОЕВАЯ СИСТЕМА: MikroTik Captive Portal + FreeRADIUS

## Архитектура

```
Клиент (смартфон) → WiFi MikroTik → Hotspot перехватывает трафик
                                    ↓
                    Открывается страница оплаты (Portal)
                                    ↓
                    Пользователь оплачивает → API Payment Server
                                    ↓
                    Backend добавляет MAC в radcheck (RADIUS)
                                    ↓
                    MikroTik → FreeRADIUS → Access-Accept
                                    ↓
                    Интернет работает до истечения paid_until
                                    ↓
                    Периодический cleanup удаляет MAC → Access-Reject
```

---

## 🔴 САМЫЕ ЧАСТЫЕ ПРИЧИНЫ "Access-Reject: Not paid"

### 1. MAC-адрес в неправильном регистре
- MikroTik шлёт: `AA:BB:CC:DD:EE:FF` (верхний регистр)
- Backend пишет в radcheck: `aa:bb:cc:dd:ee:ff` (нижний)
- **Исправлено**: SQL запросы теперь используют `LOWER()` для сравнения

### 2. IP hotspot не в clients.conf FreeRADIUS
- Если MikroTik hotspot IP = `192.168.50.1`, а clients.conf знает только `192.168.88.0/24`
- FreeRADIUS молча отбрасывает пакет
- **Исправлено**: добавлены оба диапазона в clients.conf

### 3. MAC не добавлен в radcheck после оплаты
- Проверь: `SELECT * FROM radcheck;`
- Должна быть запись с MAC и `Auth-Type = Accept`

### 4. Expired запись не удалена из radcheck
- asyncio.sleep мог не сработать при перезапуске
- **Исправлено**: periodic_cleanup_task каждые 60 сек чистит стухшие

---

## 🚀 ЗАПУСК СИСТЕМЫ (порядок важен!)

### Шаг 1: Запустить PostgreSQL
```
Убедись что PostgreSQL запущен на порту 5432
```

### Шаг 2: Инициализировать БД (только первый раз)
```cmd
psql -h localhost -U postgres -d skybeer_wifi -f setup-db.sql
```

### Шаг 3: Запустить FreeRADIUS в Docker
```cmd
cd C:\Users\hante\Desktop\PO_MikroTik\radius
docker compose up -d
docker logs radius-server --tail 20
```

> Должно быть: `Ready to process requests`

### Шаг 4: Запустить Payment API
```cmd
cd "C:\Users\hante\Desktop\PO_MikroTik\fails MikroTik\API oplata"
python payment_server.py
```
> API on http://0.0.0.0:5000

### Шаг 5: Настроить MikroTik
Открой Winbox → Terminal:
```
# Проверь IP твоего ПК (должен быть в сети 192.168.50.x или 192.168.88.x)
/ip address print

# Добавь RADIUS (замени 192.168.50.100 на IP твоего ПК!)
/radius add address=192.168.50.100 secret=radius123 service=hotspot timeout=3000ms authentication-port=1812 accounting-port=1813

# Включи RADIUS в hotspot профиле
/ip hotspot profile set [имя-профиля] use-radius=yes

# Мониторинг (смотри timeout и reject)
/radius monitor 0
```

---

## 🔍 ДИАГНОСТИКА

### Быстрая диагностика всей системы:
```cmd
cd C:\Users\hante\Desktop\PO_MikroTik\radius
psql -U postgres -d skybeer_wifi -f diagnose.sql
```

### Проверить конкретный MAC:
```sql
-- В psql:
SELECT * FROM check_mac_status('aa:bb:cc:dd:ee:ff');
```

### Живые логи FreeRADIUS:
```cmd
docker logs -f radius-server
```

### Ручная выдача доступа (для теста):
```bash
curl -X POST http://localhost:5000/api/admin/radius/grant \
  -H "Content-Type: application/json" \
  -d '{"mac_address": "aa:bb:cc:dd:ee:ff", "duration_minutes": 60}'
```

### Тест что RADIUS отвечает:
```bash
# Установить radtest: apt install freeradius-utils
radtest aa:bb:cc:dd:ee:ff ignored 127.0.0.1:1812 0 radius123
```

---

## ✅ ЧЕКЛИСТ ПРОДАКШЕНА

### MikroTik:
- [ ] `/ip hotspot profile print` → `use-radius = yes`
- [ ] `/radius print` → правильный IP и secret `radius123`
- [ ] `/ip firewall nat print` → есть masquerade правило
- [ ] `/radius monitor 0` → нет Timeouts, есть Requests

### Docker/FreeRADIUS:
- [ ] `docker ps` → radius-server Up, порты 1812 и 1813 открыты
- [ ] `docker logs radius-server` → "Ready to process requests"
- [ ] Нет "unknown client" ошибок в логах

### PostgreSQL:
- [ ] `SELECT COUNT(*) FROM radcheck;` → 0 (до оплаты)
- [ ] После тестовой оплаты → появляется запись с MAC

### API:
- [ ] `curl http://localhost:5000/health` → `{"status": "healthy"}`
- [ ] В логах API после оплаты: `✅ RADIUS access granted: MAC → group (Xs)`

---

## 📊 МОНИТОРИНГ

### Посмотреть кто сейчас онлайн:
```sql
SELECT * FROM active_paid_sessions;
```

### История авторизаций:
```sql
SELECT * FROM radpostauth ORDER BY authdate DESC LIMIT 20;
```

### Трафик пользователей:
```sql
SELECT username, framedipaddress, acctsessiontime, acctinputoctets, acctoutputoctets
FROM radacct WHERE acctstoptime IS NULL;
```

---

## 🛑 ЧАСТЫЕ ОШИБКИ

| Ошибка | Причина | Решение |
|--------|---------|---------|
| Access-Reject: Not paid | MAC не в radcheck | Проверь billing после оплаты |
| Radius timeout | Docker не слышит пакеты | Запусти fix_radius_full.bat |
| unknown client | IP MikroTik не в clients.conf | Добавь IP в clients.conf |
| MAC mismatch | Регистр букв разный | Уже исправлено через LOWER() |
| Скорость не ограничена | WISPr вместо Mikrotik-Rate-Limit | Уже исправлено в setup-db.sql |
