@echo off
chcp 65001 >nul
cls
echo =====================================================
echo  ФИКС RADIUS AUTH — WSL2 Mirrored Networking
echo =====================================================
echo.
echo Этот скрипт:
echo 1. Создаст .wslconfig с networkingMode=mirrored
echo 2. Перезапустит WSL2
echo 3. Создаст новый compose.yaml с network_mode: host
echo 4. Перезапустит контейнеры
echo.
echo [!] Требуются права Администратора!
echo [!] Docker Desktop должен использовать WSL2 backend
echo.
pause

cd /d "%~dp0"

echo.
echo [1/5] Создание .wslconfig с mirrored networking...
set WSLCONFIG=%USERPROFILE%\.wslconfig
echo [wsl2]> "%WSLCONFIG%"
echo networkingMode=mirrored>> "%WSLCONFIG%"
echo dnsTunneling=true>> "%WSLCONFIG%"
echo firewall=true>> "%WSLCONFIG%"
echo autoProxy=true>> "%WSLCONFIG%"
echo.
echo Созданный файл:
type "%WSLCONFIG%"
echo.
echo ✅ .wslconfig создан

echo.
echo [2/5] Перезапуск WSL2...
wsl --shutdown
timeout /t 3 /nobreak >nul
echo ✅ WSL2 перезапущен

echo.
echo [3/5] Останавливаем контейнеры...
docker compose down
echo.

echo [4/5] Создаём compose для host network mode...
echo ВАЖНО: После этого FreeRADIUS будет слушать напрямую на 0.0.0.0:1812 Windows
echo.

(
echo services:
echo   freeradius:
echo     build: ./freeradius
echo     container_name: radius-server
echo     restart: always
echo     network_mode: host
echo     environment:
echo       DB_HOST: 127.0.0.1
echo       DB_PORT: 5432
echo       DB_NAME: skybeer_wifi
echo       DB_USER: postgres
echo       POSTGRES_PASSWORD: 07042005
echo.
echo   admin-web:
echo     build: ./admin
echo     container_name: radius-admin
echo     restart: always
echo     network_mode: host
echo     environment:
echo       DB_HOST: 127.0.0.1
echo       DB_PORT: 5432
echo       DB_NAME: skybeer_wifi
echo       DB_USER: postgres
echo       POSTGRES_PASSWORD: 07042005
) > compose.mirrored.yaml

echo ✅ compose.mirrored.yaml создан
echo.

echo [5/5] Запуск с новым конфигом...
docker compose -f compose.mirrored.yaml up -d --build
timeout /t 5 /nobreak >nul
echo.

echo =====================================================
echo  ПРОВЕРКА
echo =====================================================
echo.
echo Контейнеры:
docker ps --format "table {{.Names}}	{{.Status}}	{{.Ports}}"
echo.

echo Порты на хосте (должен быть 0.0.0.0:1812):
netstat -an | findstr "1812\|1813"
echo.

echo radtest изнутри контейнера:
docker exec radius-server radtest 00:11:22:33:44:55 00:11:22:33:44:55 127.0.0.1 0 radius123
echo.

echo Логи FreeRADIUS:
docker logs radius-server --tail 15
echo.

echo =====================================================
echo Если видите Access-Accept — проверьте MikroTik!
echo В MikroTik: /radius monitor
echo Должны расти только accepts, без timeouts
echo =====================================================
pause
