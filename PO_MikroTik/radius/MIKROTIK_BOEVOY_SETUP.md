# ============================================================
# MIKROTIK БОЕВАЯ НАСТРОЙКА — Captive Portal + RADIUS
# Выполняй команды в MikroTik Terminal (Winbox или SSH)
# ============================================================

# ============================================================
# 1. ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ
# ============================================================

# Проверить hotspot профиль (должен быть use-radius=yes)
/ip hotspot profile print

# Проверить RADIUS настройки
/radius print

# Проверить активные сессии хотспота
/ip hotspot active print

# Проверить NAT masquerade
/ip firewall nat print

# Мониторинг RADIUS (смотришь timeout-ы и ответы)
/radius monitor 0 interval=1

# ============================================================
# 2. НАСТРОЙКА RADIUS (если не настроен)
# ============================================================

# Удали старые RADIUS записи если есть
/radius remove [find]

# Добавь RADIUS сервер
# ЗАМЕНИ 192.168.50.100 на реальный IP твоего Windows ПК!
/radius add \
    address=192.168.50.100 \
    secret=radius123 \
    service=hotspot \
    timeout=3000ms \
    authentication-port=1812 \
    accounting-port=1813

# ============================================================
# 3. HOTSPOT ПРОФИЛЬ — включить RADIUS
# ============================================================

# Посмотри имя профиля
/ip hotspot profile print

# Обнови профиль (замени "hsprof1" на реальное имя профиля!)
/ip hotspot profile set hsprof1 \
    use-radius=yes \
    nas-identifier=mikrotik

# ============================================================
# 4. HOTSPOT СЕТЬ 192.168.50.0/24
# ============================================================

# Проверь интерфейс hotspot
/ip hotspot print

# Если hotspot не настроен — настрой:
# (замени ether2 на реальный WiFi интерфейс)
# /ip hotspot setup

# Проверь IP интерфейса
/ip address print where interface=ether2

# ============================================================
# 5. NAT — MASQUERADE (обязательно!)
# ============================================================

# Проверь что есть masquerade правило
/ip firewall nat print

# Если нет — добавь (замени ether1 на WAN интерфейс!)
/ip firewall nat add \
    chain=srcnat \
    out-interface=ether1 \
    action=masquerade \
    comment="WAN masquerade"

# ============================================================
# 6. WALLED GARDEN — разрешить доступ к API без авторизации
# ============================================================

# Посмотри текущий walled garden
/ip hotspot walled-garden print
/ip hotspot walled-garden ip print

# Добавь IP твоего сервера (Windows ПК) в walled garden
# ЗАМЕНИ 192.168.50.100 на реальный IP!
/ip hotspot walled-garden ip add \
    dst-address=192.168.50.100 \
    action=accept \
    comment="Payment API server"

# Разрешить DNS для страниц оплаты
/ip hotspot walled-garden add \
    dst-host=192.168.50.100 \
    action=allow \
    comment="Payment server domain"

# ============================================================
# 7. FIREWALL — правильный порядок правил
# ============================================================

# Проверить порядок правил
/ip firewall filter print

# ВАЖНО: правило "hotspot" должно стоять ДО drop правил!
# Hotspot сам управляет доступом через RADIUS

# ============================================================
# 8. ДИАГНОСТИКА RADIUS СОЕДИНЕНИЯ
# ============================================================

# Мониторинг в реальном времени (смотри Bad-Request, Timeout)
/radius monitor 0

# Если есть Timeouts — RADIUS не отвечает. Проверь:
# 1. IP сервера правильный?
# 2. Порт 1812 открыт на Windows?
# 3. Docker контейнер запущен?
# 4. Firewall Windows не блокирует UDP 1812?

# ============================================================
# 9. ТЕСТ АВТОРИЗАЦИИ ВРУЧНУЮ
# ============================================================

# Добавить тестовую сессию вручную (для проверки)
# /ip hotspot active print → видишь текущих пользователей

# Проверить активные сессии
/ip hotspot active print detail

# ============================================================
# 10. ВАЖНЫЕ ПАРАМЕТРЫ HOTSPOT
# ============================================================

# Проверить IP pool для hotspot
/ip pool print

# Проверить DHCP сервер hotspot
/ip dhcp-server print

# ============================================================
# ЧЕКЛИСТ ПРОВЕРКИ
# ============================================================
# ✅ /ip hotspot profile print → use-radius=yes
# ✅ /radius print → правильный IP и secret
# ✅ /ip firewall nat print → есть masquerade
# ✅ /radius monitor 0 → нет Timeouts
# ✅ /ip hotspot active print → сессии появляются после оплаты
# ✅ В логах Docker FreeRADIUS → Access-Accept для оплаченных
