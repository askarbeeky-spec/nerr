# 🔧 Настройка MikroTik для SKY Internet (по ТЗ MVP)

## 📋 Данные для настройки

```
IP роутера:         192.168.88.1
IP сервера (ПК):    192.168.88.253
Порт API:           8080
RADIUS secret:      radius123
RADIUS Auth порт:   1812
RADIUS Acct порт:   1813
SSID Wi-Fi:         SKY_Internet
```

---

## 🔐 Шаг 1: Настройка RADIUS

### В WinBox: RADIUS → "+" → заполните:

| Поле | Значение |
|------|----------|
| Service | ✅ hotspot |
| Address | `192.168.88.253` |
| Secret | `radius123` |
| Authentication Port | `1812` |
| Accounting Port | `1813` |
| Timeout | `3000` (3 сек) |

```routeros
# Или через терминал:
/radius
add address=192.168.88.253 secret=radius123 service=hotspot timeout=3s
```

---

## 🌐 Шаг 2: Настройка Wi-Fi (открытая сеть)

```routeros
# Открытая сеть без пароля (для Captive Portal)
/interface wireless
set [ find default-name=wlan1 ] \
    disabled=no \
    mode=ap-bridge \
    ssid="SKY_Internet" \
    security-profile=default

/interface wireless security-profiles
set [ find default=yes ] mode=none authentication-types=""
```

---

## 🔥 Шаг 3: Настройка Hotspot

### 3.1 IP пул для клиентов

```routeros
/ip pool
add name=hs-pool ranges=192.168.50.2-192.168.50.254

/ip dhcp-server network
add address=192.168.50.0/24 gateway=192.168.50.1 dns-server=8.8.8.8,8.8.4.4
```

### 3.2 Запуск Hotspot (через WinBox):
1. **IP → Hotspot → Hotspot Setup**
2. Interface: **wlan1**
3. Local Address: **192.168.50.1/24**
4. Address Pool: **hs-pool**
5. DNS Name: **sky.wifi** (или любое)
6. Пропустить создание пользователя

### 3.3 Настройка профиля Hotspot

```routeros
/ip hotspot profile
set [ find default=yes ] \
    login-by=mac-cookie \
    use-radius=yes \
    nas-port-type=wireless-802.11 \
    idle-timeout=none \
    keepalive-timeout=2m \
    status-autorefresh=1m
```

> ⚠️ **Важно:** `login-by=mac-cookie` — это ключевой параметр!
> MikroTik будет авторизовывать по MAC-адресу через RADIUS.

---

## 🌍 Шаг 4: Walled Garden (белый список)

Разрешаем доступ к серверу оплаты БЕЗ авторизации:

```routeros
/ip hotspot walled-garden
add dst-host=192.168.88.253 comment="SKY Internet API Server"
add dst-host=fonts.googleapis.com comment="Google Fonts"
add dst-host=fonts.gstatic.com comment="Google Fonts Static"

# Платежные шлюзы (по ТЗ: Mbank, Visa, O!Dengi)
add dst-host=*.mbank.kg comment="Mbank"
add dst-host=*.odengi.kg comment="O!Dengi"
add dst-host=*.visa.com comment="Visa"
```

### Walled Garden IP (для IP-адресов):

```routeros
/ip hotspot walled-garden ip
add dst-address=192.168.88.253 comment="API Server"
add dst-address=8.8.8.8 comment="Google DNS"
add dst-address=8.8.4.4 comment="Google DNS"
```

---

## 📁 Шаг 5: Загрузка Captive Portal на роутер

### Вариант A: Редирект на внешний сервер (РЕКОМЕНДУЕТСЯ для MVP)

Подключитесь по FTP к роутеру (FileZilla):
- Host: `192.168.88.1`
- Protocol: FTP
- User: `admin`
- Port: `21`

Создайте файл `/hotspot/login.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh"
          content="0; url=http://192.168.88.253:8080?mac=$(mac)&ip=$(ip)&router=router_demo_001" />
</head>
<body>
    <p>Перенаправление на портал оплаты...</p>
</body>
</html>
```

> MikroTik автоматически подставит `$(mac)` и `$(ip)` — реальные данные клиента.

---

## ✅ Шаг 6: Firewall правила

```routeros
# Разрешаем трафик Hotspot
/ip firewall filter
add chain=input protocol=tcp dst-port=80 \
    in-interface=wlan1 action=accept \
    comment="Hotspot HTTP"

add chain=input protocol=tcp dst-port=443 \
    in-interface=wlan1 action=accept \
    comment="Hotspot HTTPS"

add chain=input protocol=udp dst-port=53 \
    in-interface=wlan1 action=accept \
    comment="Hotspot DNS"

# NAT для выхода в интернет
/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade \
    comment="Hotspot NAT"
```

---

## 🧪 Шаг 7: Проверка

### Проверка RADIUS:
```routeros
/radius print detail
/log print where topics~"radius"
```

### Проверка Hotspot:
```routeros
/ip hotspot print
/ip hotspot active print
```

### Тест с клиента:
1. Подключитесь к Wi-Fi **SKY_Internet**
2. Откройте браузер — должна открыться страница оплаты
3. Выберите тариф (1 час / 1 сутки)
4. Нажмите "Оплатить" (фейковая оплата)
5. Интернет должен заработать автоматически ✅

---

## 🐛 Решение проблем

### Проблема: RADIUS не отвечает
```routeros
/log print where topics~"radius"
# Проверьте IP: 192.168.88.253 и порт 1812
# Убедитесь что Docker запущен на ПК
```

### Проблема: Не перенаправляет на портал
```routeros
/ip dns set allow-remote-requests=yes
/ip hotspot print
# Должен быть enabled
```

### Проблема: После оплаты интернет не работает
```routeros
/ip hotspot active print
# Должна появиться запись с MAC клиента
/log print where topics~"hotspot"
```

---

## 📊 Мониторинг (по ТЗ)

```routeros
# Активные пользователи
/ip hotspot active print

# Логи RADIUS
/log print where topics~"radius"

# Статистика трафика
/interface print stats where name=wlan1
```

---

## 🚀 Production Checklist

- [ ] Сменить пароль admin на роутере
- [ ] Настроить HTTPS для портала
- [ ] Подключить реальный платежный шлюз (Mbank API)
- [ ] Настроить Telegram-уведомления (мониторинг)
- [ ] Протестировать все тарифы
- [ ] Обновить firmware MikroTik
- [ ] Настроить резервный канал интернета
- [ ] Включить NAT-логирование (требование законов КР)
