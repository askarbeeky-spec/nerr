@echo off
chcp 65001 >nul
cls
echo =====================================================
echo  ДИАГНОСТИКА: Где теряется пакет Auth 1812?
echo  Нужны права АДМИНИСТРАТОРА!
echo =====================================================
echo.
echo Запустите этот скрипт и держите открытым.
echo Он будет ловить пакеты пока вы нажмёте Ctrl+C.
echo.
echo ПАРАЛЛЕЛЬНО откройте второй терминал и запустите:
echo   docker logs radius-server -f
echo.

cd /d "%~dp0"

echo [1] Очистка...
pktmon stop >nul 2>&1
pktmon filter remove >nul 2>&1

echo [2] Установка фильтров...
pktmon filter add Auth1812 -p 1812 -t UDP
pktmon filter add Acct1813 -p 1813 -t UDP

echo.
echo [3] Запуск захвата (реального времени — ctrl+C чтобы остановить)...
echo.
echo Теперь:
echo   1. Отключите телефон от WiFi MikroTik
echo   2. Подключите заново
echo   3. Посмотрите что появляется ниже
echo.

pktmon start --etw --real-time -p 1812 -t UDP 2>nul
if %errorlevel% neq 0 (
    echo Real-time не поддерживается, используем обычный захват 30 сек...
    echo.
    echo !!! ПРЯМО СЕЙЧАС: отключите и подключите телефон к MikroTik WiFi !!!
    echo.
    pktmon start --etw --pkt-size 256
    timeout /t 30 /nobreak
    pktmon stop

    echo Анализ...
    pktmon format pktmon.etl -o pktmon_30s.txt >nul 2>&1

    echo.
    echo ===== ПАКЕТЫ С 192.168.88.1 (MikroTik) =====
    findstr "192.168.88" "C:\Windows\system32\pktmon_30s.txt" 2>nul || findstr "192.168.88" pktmon_30s.txt 2>nul
    echo.
    echo ===== ПАКЕТЫ НА ПОРТ 1812 =====
    findstr /C:":1812" "C:\Windows\system32\pktmon_30s.txt" 2>nul || findstr /C:":1812" pktmon_30s.txt 2>nul
    echo.
    echo ===== ВСЕ UDP ПАКЕТЫ =====
    findstr "UDP" "C:\Windows\system32\pktmon_30s.txt" 2>nul | findstr "1812\|1813" ||  findstr "UDP" pktmon_30s.txt 2>nul | findstr "1812\|1813"
    echo.
    echo Полный файл: посмотрите pktmon_30s.txt
)

echo.
echo =====================================================
echo ИНТЕРПРЕТАЦИЯ:
echo.
echo ЕСЛИ хоть один пакет с src=192.168.88.1 dst=1812:
echo   → Пакет ДОХОДИТ до Windows, проблема внутри Docker
echo.
echo ЕСЛИ пакет src=172.18.x.x dst=172.18.x.x:1812:
echo   → Docker forwarding работает, проблема в ответе
echo.
echo ЕСЛИ пакетов нет вообще:
echo   → Пакет НЕ доходит до Windows
echo   → Проверьте IP/маршруты между MikroTik и этим ПК
echo   → Проверьте что Windows Firewall разрешает UDP 1812
echo =====================================================
pause
