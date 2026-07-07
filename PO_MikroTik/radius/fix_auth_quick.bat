@echo off
chcp 65001 >nul
echo ============================================
echo  RADIUS AUTH ФИКС - Docker Desktop UDP
echo ============================================
echo.
echo [!] Запустите от имени Администратора!
echo.
echo Шаг 1: Останавливаем контейнеры...
cd /d "%~dp0"
docker compose down
echo.

echo Шаг 2: Добавляем Windows Firewall правило для UDP 1812...
netsh advfirewall firewall delete rule name="FreeRADIUS-Auth-1812" >nul 2>&1
netsh advfirewall firewall add rule name="FreeRADIUS-Auth-1812" protocol=UDP dir=in localport=1812 action=allow
netsh advfirewall firewall add rule name="FreeRADIUS-Auth-1812-out" protocol=UDP dir=out localport=1812 action=allow
echo.

echo Шаг 3: Запускаем с новым compose...
docker compose up -d
echo.

echo Шаг 4: Ждём запуска FreeRADIUS (5 сек)...
timeout /t 5 /nobreak >nul

echo Шаг 5: radtest изнутри контейнера (тест конфига)...
docker exec radius-server radtest 00:11:22:33:44:55 00:11:22:33:44:55 127.0.0.1 0 radius123
echo.

echo Шаг 6: radtest с хоста на 127.0.0.1:1812 (тест NAT)...
docker exec radius-server radtest 00:11:22:33:44:55 00:11:22:33:44:55 host.docker.internal 0 radius123
echo.

echo Шаг 7: Текущие логи...
docker logs radius-server --tail 30
echo.

echo ============================================
echo ЕСЛИ radtest на host.docker.internal работает:
echo   → Docker NAT ОК, проблема была в firewall
echo.
echo ЕСЛИ не работает:
echo   → Нужен Вариант B (WSL2 mirrored networking)
echo ============================================
pause
