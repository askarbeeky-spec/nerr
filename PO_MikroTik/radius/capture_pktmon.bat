@echo off
chcp 65001 >nul
cls
echo =====================================================
echo  PKTMON ЗАХВАТ — смотрим реальные пакеты на 1812
echo  Запустите от имени АДМИНИСТРАТОРА!
echo =====================================================
echo.
echo Пока этот скрипт работает — попробуйте подключиться
echo к WiFi MikroTik с телефона/ноутбука.
echo.
echo [1/3] Очистка старых данных...
pktmon stop >nul 2>&1
pktmon filter remove >nul 2>&1
del pktmon_radius.etl >nul 2>&1
del pktmon_radius.txt >nul 2>&1

echo [2/3] Добавляем фильтр на UDP 1812 и 1813...
pktmon filter add RADIUS-Auth -p 1812 -t UDP
pktmon filter add RADIUS-Acct -p 1813 -t UDP

echo.
echo [3/3] Захват 15 секунд...
echo.
echo !!! Сейчас подключите телефон к MikroTik WiFi !!!
echo.
pktmon start --etw --pkt-size 256

timeout /t 15 /nobreak

pktmon stop
echo.
echo Анализ захваченных пакетов...
pktmon format pktmon.etl -o pktmon_radius.txt >nul 2>&1

echo.
echo =====================================================
echo  РЕЗУЛЬТАТЫ (пакеты на 1812/1813):
echo =====================================================
type pktmon_radius.txt | findstr /i "1812\|1813\|192.168.88\|172.18\|UDP"
echo.
echo =====================================================
echo.
echo Объяснение:
echo  - Если видите пакеты 192.168.88.1 → 192.168.88.254:1812 = MikroTik шлёт ✅
echo  - Если видите только 172.18.0.1 → 172.18.0.x:1812 = Docker видит ✅
echo  - Если видите ответ 172.18.0.x → 172.18.0.1 = Docker отвечает...
echo  - Если НЕ видите ответа назад на 192.168.88.1 = NAT сломан ❌
echo.
echo Полный файл: pktmon_radius.txt
echo.
pause
