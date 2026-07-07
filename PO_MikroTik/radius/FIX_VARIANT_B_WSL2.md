# RADIUS Auth Fix — Вариант B: WSL2 Mirrored Networking

## Почему это надёжнее

WSL2 mirrored networking = контейнер видит **реальный** IP MikroTik (192.168.88.1),
а не Docker NAT IP (172.18.0.1). Проблема UDP NAT исчезает полностью.

---

## Шаг 1: Включите WSL2 Mirrored режим

Создайте/отредактируйте файл `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
dnsTunneling=true
firewall=true
autoProxy=true
```

Перезапустите WSL2:
```powershell
wsl --shutdown
```

---

## Шаг 2: Переключите Docker Desktop на WSL2 backend

В Docker Desktop:
1. Settings → General → Use WSL 2 based engine ✅
2. Settings → Resources → WSL Integration → включить вашу дистрибуцию
3. Apply & Restart

---

## Шаг 3: Обновите compose.yaml для WSL2

```yaml
services:
  freeradius:
    build: ./freeradius
    container_name: radius-server
    restart: always
    # В WSL2 mirrored mode можно использовать host network
    network_mode: host
    environment:
      DB_HOST: 127.0.0.1   # Теперь localhost = Windows хост
      DB_PORT: 5432
      DB_NAME: skybeer_wifi
      DB_USER: postgres
      POSTGRES_PASSWORD: 07042005
```

### ВАЖНО: При `network_mode: host`:
- FreeRADIUS слушает прямо на Windows IP `192.168.88.254:1812`
- Никакого NAT — MikroTik общается напрямую
- UDP работает без проблем

---

## Шаг 4: Обновите FreeRADIUS listen секцию

В `/etc/freeradius/sites-enabled/default` убедитесь:

```
listen {
    type = auth
    ipaddr = *        # слушать на всех интерфейсах
    port = 1812
}
listen {
    type = acct
    ipaddr = *
    port = 1813
}
```

---

## Шаг 5: Проверка

```bash
# После запуска проверьте что FreeRADIUS слушает на правильном IP:
netstat -an | findstr "1812"
# Должно быть: UDP  192.168.88.254:1812  *:*

# Тест с хоста:
radtest 00:11:22:33:44:55 00:11:22:33:44:55 192.168.88.254 0 radius123
# Должен вернуть Access-Accept

# Sniff на MikroTik:
# /tool sniffer quick port=1812 ip-address=192.168.88.254
```

---

## Альтернатива: если не хотите WSL2 mirrored

Запустите FreeRADIUS **напрямую на Windows** (не в Docker):

```powershell
# 1. Скачайте FreeRADIUS для Windows или используйте WSL
wsl sudo apt install freeradius -y
wsl sudo freeradius -X

# 2. FreeRADIUS в WSL будет доступен как 127.0.0.1:1812 на Windows
# 3. МикроТик шлёт на 192.168.88.254:1812 — Windows слышит — WSL обрабатывает
```

---

## Почему socat (текущий udp-relay) не работал

socat `UDP4-RECVFROM → UDP4-SENDTO` при форварде RADIUS:

1. MikroTik → `src: 192.168.88.1:XXXXX, dst: 192.168.88.254:1812`
2. socat принимает, создаёт **новый** UDP сокет → `src: socat_container_ip:YYYYY`
3. FreeRADIUS отвечает на `socat_container_ip:YYYYY`
4. socat получает ответ, но **не знает** на какой порт MikroTik'а отправить
   (потому что `RECVFROM:11812` — статичный порт, а не динамический форвард)
5. Ответ теряется → timeout

**Правильный relay должен быть stateful** (запоминать src port каждого клиента).
socat это не умеет для UDP. Нужен настоящий UDP proxy (например `udp-proxy` или `rfc_proxy`).
