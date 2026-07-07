@echo off
chcp 65001 >nul
cls
echo =============================================
echo  RADIUS AUTH ДИАГНОСТИКА (Step-by-step)
echo =============================================
echo.

echo [STEP 1] Проверка что порты реально слушаются на хосте...
echo.
netstat -an -p UDP | findstr "1812\|1813"
echo.

echo [STEP 2] Проверка Docker контейнеров...
echo.
docker ps --format "table {{.Names}}	{{.Status}}	{{.Ports}}"
echo.

echo [STEP 3] Тест radtest изнутри контейнера (localhost)...
echo   Если этот работает - FreeRADIUS ОК, проблема в NAT/сети
echo.
docker exec radius-server radtest 00:11:22:33:44:55 00:11:22:33:44:55 127.0.0.1 0 radius123 2>&1
echo.

echo [STEP 4] Тест radtest с Windows хоста на 127.0.0.1:1812...
echo   (нужен radtest на хосте, иначе пропустить)
echo.
where radtest >nul 2>&1
if %errorlevel% equ 0 (
    radtest 00:11:22:33:44:55 00:11:22:33:44:55 127.0.0.1 0 radius123
) else (
    echo   radtest не найден на хосте - используем PowerShell тест
    echo   Отправляем pakctmon трассировку...
)
echo.

echo [STEP 5] Последние логи FreeRADIUS (Auth запросы)...
echo   Смотрим, доходят ли Access-Request...
echo.
docker logs radius-server --tail 100 2>&1 | findstr /i "Access-Request\|Access-Accept\|Access-Reject\|Auth\|timeout\|auth"
echo.
echo   Если ничего не найдено - пакеты НЕ доходят до FreeRADIUS!
echo.

echo [STEP 6] Проверка Windows Firewall для UDP 1812...
echo.
netsh advfirewall firewall show rule name="FreeRADIUS Auth" 2>&1
echo.

echo [STEP 7] UDP connectivity test на порт 1812...
echo.
powershell -Command "try { $udp = New-Object System.Net.Sockets.UdpClient; $udp.Connect('127.0.0.1', 1812); $bytes = [System.Text.Encoding]::ASCII.GetBytes('test'); $udp.Send($bytes, $bytes.Length) | Out-Null; Write-Host 'UDP 1812: порт доступен'; $udp.Close() } catch { Write-Host 'UDP 1812: ОШИБКА -' $_.Exception.Message }"
echo.

echo [STEP 8] pktmon — захват пакетов на 1812 (5 секунд)...
echo   Нужно чтобы MikroTik попробовал аутентификацию за это время
echo.
pktmon start --etw --comp nics --pkt-size 256 --bpf "udp port 1812" 2>&1
if %errorlevel% neq 0 (
    echo   pktmon требует права Admin - запустите BAT от имени Администратора
) else (
    timeout /t 5 /nobreak >nul
    pktmon stop 2>&1
    pktmon format PktMon.etl -o pktmon_1812.txt 2>&1
    echo   Результат: pktmon_1812.txt
    type pktmon_1812.txt | findstr /i "1812\|radius\|src\|dst" | head -30 2>&1
    del PktMon.etl 2>nul
)
echo.

echo =============================================
echo  ВЫВОД:
echo =============================================
echo.
echo А) Если [STEP 3] OK, [STEP 4/5] fail - проблема в Docker NAT/Windows
echo Б) Если [STEP 3] fail - проблема в конфиге FreeRADIUS (default site)
echo В) Если [STEP 6] нет правил - добавьте firewall rule для UDP 1812
echo.
echo Не забудьте показать вывод этого скрипта!
echo.
pause
