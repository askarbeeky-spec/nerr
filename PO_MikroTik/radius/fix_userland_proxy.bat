@echo off
chcp 65001 >nul
cls
echo ================================================
echo  ФИНАЛЬНЫЙ ФИС: Docker userland-proxy = false
echo  Это решает ОБОИМ проблемам: 1812 и 1813
echo ================================================
echo.
echo Проблема: Docker Desktop использует userspace proxy
echo для UDP. Он теряет UDP connection tracking и ломает
echo возврат пакетов от FreeRADIUS к MikroTik.
echo.
echo Решение: отключить userland-proxy → Docker будет
echo использовать iptables напрямую (надёжнее для UDP).
echo.
echo [1/3] Находим Docker daemon.json...
set DOCKER_CONFIG=%APPDATA%\Docker\settings-store.json
set DOCKER_DAEMON=%USERPROFILE%\.docker\daemon.json

echo.
echo Проверяем %DOCKER_DAEMON%...
if exist "%DOCKER_DAEMON%" (
    echo Файл существует. Содержимое:
    type "%DOCKER_DAEMON%"
    echo.
    echo ВАЖНО: нужно добавить "userland-proxy": false
    echo Отредактируйте файл вручную!
) else (
    echo Файл не существует, создаём...
    echo {"userland-proxy": false} > "%DOCKER_DAEMON%"
    echo ✅ Создан %DOCKER_DAEMON%
    type "%DOCKER_DAEMON%"
)
echo.

echo [2/3] Альтернативный путь через Docker Desktop UI...
echo.
echo В Docker Desktop:
echo   → Settings → Docker Engine
echo   → Добавьте в JSON: "userland-proxy": false
echo   → Apply and Restart
echo.

echo [3/3] Инструкция для Docker Desktop Settings...
echo.
echo Текущий daemon.json (если создан):
if exist "%DOCKER_DAEMON%" type "%DOCKER_DAEMON%"
echo.
echo ================================================
echo Откройте Docker Desktop:
echo   Settings (шестерёнка) → Docker Engine
echo   Найдите или добавьте: "userland-proxy": false
echo   Нажмите: Apply and restart
echo ================================================
echo.
pause
