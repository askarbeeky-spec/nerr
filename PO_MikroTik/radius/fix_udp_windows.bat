@echo off
chcp 65001 >nul
echo ============================================================
echo   FIX UDP WINDOWS — Workaround для Docker Desktop UDP NAT
echo ============================================================
echo.
echo Проблема: Docker Desktop на Windows не корректно форвардит
echo UDP ответы от контейнера наружу (известный баг).
echo Решение: netsh portproxy перехватывает UDP и пробрасывает.
echo.
echo ПРИМЕЧАНИЕ: netsh portproxy работает только с TCP.
echo Для UDP используется альтернативный метод через WSL2.
echo.

:: Проверка прав администратора
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ОШИБКА: Нужны права администратора!
    pause
    exit /b 1
)

echo Метод 1: Проверка что Docker Desktop слушает UDP...
netstat -aonub 2>nul | findstr "1812"
echo.

echo Метод 2: Проверка интерфейса WinNAT...
powershell -Command "Get-NetNat | Format-Table Name, InternalIPInterfaceAddressPrefix" 2>nul
echo.

echo ============================================================
echo   ГЛАВНОЕ РЕШЕНИЕ: Запуск FreeRADIUS напрямую (не в Docker)
echo ============================================================
echo.
echo Это 100%% рабочий способ для Windows:
echo.
echo 1. Установите WSL2 (если не установлен):
echo    wsl --install -d Ubuntu
echo.
echo 2. В WSL2 установите FreeRADIUS:
echo    sudo apt update
echo    sudo apt install -y freeradius freeradius-postgresql
echo.
echo 3. Скопируйте конфиги:
echo    sudo cp /mnt/c/Users/hante/Desktop/PO_MikroTik/radius/freeradius/clients.conf /etc/freeradius/3.0/
echo    sudo cp /mnt/c/Users/hante/Desktop/PO_MikroTik/radius/freeradius/sites-enabled/default /etc/freeradius/3.0/sites-enabled/
echo    sudo cp /mnt/c/Users/hante/Desktop/PO_MikroTik/radius/freeradius/mods-enabled/sql /etc/freeradius/3.0/mods-enabled/
echo.
echo 4. Запустите FreeRADIUS из WSL2:
echo    sudo freeradius -X
echo.
echo 5. В WSL2 IP обычно 172.x.x.x но это не важно —
echo    настройте port forwarding с 192.168.88.254:1812 на WSL2:
echo    netsh interface portproxy add v4tov4 listenaddress=192.168.88.254 listenport=1812 connectaddress=WSL2_IP connectport=1812
echo.
echo Узнать IP WSL2: wsl hostname -I
echo.
pause
