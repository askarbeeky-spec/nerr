@echo off
chcp 65001 >nul
echo ============================================================
echo   RESTART RADIUS — Пересборка и запуск с нуля
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/5] Остановка старых контейнеров...
docker compose down --remove-orphans
echo.

echo [2/5] Удаление старого образа (чтобы конфиги обновились)...
docker rmi radius-freeradius 2>nul
docker rmi po_mikrotik-freeradius 2>nul
docker rmi radius_freeradius 2>nul
echo.

echo [3/5] Пересборка с новыми конфигами...
docker compose build --no-cache freeradius
if %errorlevel% neq 0 (
    echo ОШИБКА при сборке! Проверьте Docker.
    pause
    exit /b 1
)
echo.

echo [4/5] Запуск...
docker compose up -d
echo.

echo [5/5] Ожидание запуска (5 сек)...
timeout /t 5 /nobreak >nul

echo.
echo ============================================================
echo   ПРОВЕРКА СТАТУСА
echo ============================================================
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo Тест radtest (изнутри контейнера):
docker exec radius-server radtest 112233445566 112233445566 127.0.0.1 1 radius123 2>&1
echo.

echo Логи (последние 20 строк):
docker logs --tail=20 radius-server 2>&1
echo.

echo ============================================================
echo   ЕСЛИ "Access-Accept" выше — FreeRADIUS работает!
echo   Если нет — запустите diagnose_radius.bat
echo ============================================================
echo.
pause
