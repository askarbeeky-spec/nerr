@echo off
chcp 65001 >nul
cls
echo =====================================================
echo  Запуск FreeRADIUS в host network mode
echo  (после рестарта Docker Desktop с mirrored WSL2)
echo =====================================================
echo.

cd /d "%~dp0"

echo [1/4] Проверка что Docker запущен...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker не запущен! Запустите Docker Desktop сначала.
    pause
    exit /b 1
)
echo ✅ Docker запущен

echo.
echo [2/4] Запуск контейнеров с host network...
docker compose -f compose.mirrored.yaml up -d --build
if %errorlevel% neq 0 (
    echo ❌ Ошибка запуска!
    pause
    exit /b 1
)

echo.
echo [3/4] Ожидание старта FreeRADIUS (5 сек)...
timeout /t 5 /nobreak >nul

echo.
echo [4/4] Проверка...
echo.
echo --- Контейнеры ---
docker ps --format "table {{.Names}}	{{.Status}}	{{.Ports}}"
echo.

echo --- Порты на хосте ---
netstat -an | findstr "1812\|1813"
echo.
echo Ожидаем: UDP  0.0.0.0:1812  *:*

echo.
echo --- Network mode ---
docker inspect radius-server --format "NetworkMode: {{.HostConfig.NetworkMode}}"
echo Ожидаем: NetworkMode: host

echo.
echo --- radtest (внутри контейнера) ---
docker exec radius-server radtest 00:11:22:33:44:55 00:11:22:33:44:55 127.0.0.1 0 radius123
echo.

echo --- Логи ---
docker logs radius-server --tail 10
echo.

echo =====================================================
echo ИТОГ:
echo.
echo Если NetworkMode = host и Access-Accept получен:
echo   → Подключите устройство к MikroTik WiFi
echo   → Смотрите: docker logs radius-server -f
echo   → В MikroTik: /radius monitor
echo.
echo Если NetworkMode НЕ host:
echo   → Нужно перезапустить Docker Desktop с mirrored WSL2
echo   → Затем запустить этот скрипт снова
echo =====================================================
pause
