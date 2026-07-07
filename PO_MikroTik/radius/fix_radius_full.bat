@echo off
chcp 65001
echo ============================================================
echo   ПОЛНАЯ ДИАГНОСТИКА И ИСПРАВЛЕНИЕ RADIUS СИСТЕМЫ
echo ============================================================
echo.

:: ============================================================
:: 1. Проверяем Docker
:: ============================================================
echo [1/8] Проверяем Docker...
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul
if errorlevel 1 (
    echo ОШИБКА: Docker не запущен! Запусти Docker Desktop.
    pause
    exit /b 1
)
echo.

:: ============================================================
:: 2. Проверяем контейнер FreeRADIUS
:: ============================================================
echo [2/8] Проверяем контейнер radius-server...
docker ps --filter name=radius-server --format "{{.Status}}" > tmp_status.txt 2>nul
set /p RADIUS_STATUS=<tmp_status.txt
del tmp_status.txt 2>nul

if "%RADIUS_STATUS%"=="" (
    echo RADIUS контейнер НЕ ЗАПУЩЕН! Запускаем...
    cd /d "%~dp0"
    docker compose up -d
    timeout /t 5 /nobreak > nul
) else (
    echo ОК: radius-server запущен (%RADIUS_STATUS%)
)
echo.

:: ============================================================
:: 3. Проверяем порты 1812 и 1813
:: ============================================================
echo [3/8] Проверяем UDP порты 1812 и 1813...
netstat -an | findstr ":1812" | findstr "UDP"
if errorlevel 1 (
    echo ВНИМАНИЕ: Порт 1812 не виден в netstat (UDP нормально не показывается)
)
netstat -an | findstr ":1813" | findstr "UDP"
echo.

:: ============================================================
:: 4. Проверяем PostgreSQL
:: ============================================================
set PSQL="C:\Program Files\PostgreSQL\18\bin\psql.exe"
set PGPASSWORD=07042005
echo [4/8] Проверяем PostgreSQL...
%PSQL% -h localhost -U postgres -c "SELECT version();" 2>nul | findstr "PostgreSQL"
if errorlevel 1 (
    echo ВНИМАНИЕ: PostgreSQL не отвечает!
    echo Убедись что PostgreSQL запущен на порту 5432
) else (
    echo ОК: PostgreSQL запущен
)
echo.

:: ============================================================
:: 5. Проверяем базу данных и таблицы
:: ============================================================
echo [5/8] Проверяем таблицы в БД skybeer_wifi...
%PSQL% -h localhost -U postgres -d skybeer_wifi -c "\dt" 2>nul
if errorlevel 1 (
    echo ВНИМАНИЕ: Не могу подключиться к skybeer_wifi
    echo Проверь пароль в .env файле
) else (
    echo.
    echo Активные сессии в billing:
    %PSQL% -h localhost -U postgres -d skybeer_wifi -c "SELECT mac_address, tariff_name, expires_at FROM billing_sessions WHERE status='active' AND expires_at > NOW();" 2>nul
    echo.
    echo MAC-адреса в radcheck:
    %PSQL% -h localhost -U postgres -d skybeer_wifi -c "SELECT username, attribute, value FROM radcheck;" 2>nul
)
echo.

:: ============================================================
:: 6. Очищаем истёкшие сессии из RADIUS таблиц
:: ============================================================
echo [6/8] Очищаем истёкшие сессии...
%PSQL% -h localhost -U postgres -d skybeer_wifi -f "%~dp0cleanup_expired.sql" 2>nul
if errorlevel 1 (
    echo ВНИМАНИЕ: Не удалось запустить cleanup_expired.sql
) else (
    echo ОК: Очистка выполнена
)
echo.

:: ============================================================
:: 7. Проверяем Firewall Windows (UDP 1812, 1813)
:: ============================================================
echo [7/8] Проверяем Windows Firewall для RADIUS...
netsh advfirewall firewall show rule name="FreeRADIUS-1812" 2>nul | findstr "Enabled"
if errorlevel 1 (
    echo Добавляем правила firewall для RADIUS...
    netsh advfirewall firewall add rule name="FreeRADIUS-1812" protocol=UDP dir=in localport=1812 action=allow 2>nul
    netsh advfirewall firewall add rule name="FreeRADIUS-1813" protocol=UDP dir=in localport=1813 action=allow 2>nul
    echo ОК: Правила добавлены
) else (
    echo ОК: Правила firewall уже есть
)
echo.

:: ============================================================
:: 8. Перезапускаем FreeRADIUS (применяем новые configs)
:: ============================================================
echo [8/8] Перезапускаем FreeRADIUS с новой конфигурацией...
cd /d "%~dp0"
docker compose restart freeradius
timeout /t 3 /nobreak > nul
echo.

:: ============================================================
:: ФИНАЛЬНЫЙ ЛОГ
:: ============================================================
echo ============================================================
echo   ЛОГИ FreeRADIUS (последние 30 строк)
echo ============================================================
docker logs radius-server --tail 30 2>nul
echo.

echo ============================================================
echo   РЕЗУЛЬТАТ: Видишь "Ready to process requests" → ОК
echo   Видишь "Access-Accept" → авторизация работает
echo   Видишь "Access-Reject: Not paid" → MAC не в radcheck
echo ============================================================
echo.
echo Для живых логов: docker logs -f radius-server
echo Для диагностики БД: psql -U postgres -d skybeer_wifi -f diagnose.sql
echo.
pause
