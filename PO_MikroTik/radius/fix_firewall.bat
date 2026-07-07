@echo off
chcp 65001 >nul
echo ============================================================
echo   FIX FIREWALL — Открытие UDP портов для RADIUS
echo   Запустить от имени АДМИНИСТРАТОРА!
echo ============================================================
echo.

:: Проверка прав администратора
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ОШИБКА: Нужны права администратора!
    echo Нажмите правой кнопкой -> "Запуск от имени администратора"
    pause
    exit /b 1
)

echo [1/4] Удаление старых правил...
netsh advfirewall firewall delete rule name="FreeRADIUS Auth UDP 1812" >nul 2>&1
netsh advfirewall firewall delete rule name="FreeRADIUS Acct UDP 1813" >nul 2>&1
netsh advfirewall firewall delete rule name="SkyBeer RADIUS Auth" >nul 2>&1
netsh advfirewall firewall delete rule name="SkyBeer RADIUS Acct" >nul 2>&1
echo    OK

echo [2/4] Открываем UDP 1812 (RADIUS Auth)...
netsh advfirewall firewall add rule ^
    name="FreeRADIUS Auth UDP 1812" ^
    dir=in ^
    action=allow ^
    protocol=UDP ^
    localport=1812 ^
    remoteip=192.168.88.0/24,172.16.0.0/12,10.0.0.0/8 ^
    profile=any
echo    OK

echo [3/4] Открываем UDP 1813 (RADIUS Accounting)...
netsh advfirewall firewall add rule ^
    name="FreeRADIUS Acct UDP 1813" ^
    dir=in ^
    action=allow ^
    protocol=UDP ^
    localport=1813 ^
    remoteip=192.168.88.0/24,172.16.0.0/12,10.0.0.0/8 ^
    profile=any
echo    OK

echo [4/4] Проверка правил...
netsh advfirewall firewall show rule name="FreeRADIUS Auth UDP 1812" | findstr "Rule Name\|Action\|Protocol\|LocalPort"
echo.

echo ============================================================
echo   ГОТОВО! Теперь перезапустите контейнер:
echo   docker compose -f radius/compose.yaml up --build -d
echo ============================================================
pause
