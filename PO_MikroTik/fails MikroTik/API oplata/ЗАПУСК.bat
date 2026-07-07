@echo off
chcp 65001 >nul
title Payment Auto-Confirmation Server - Запуск

echo ╔══════════════════════════════════════════════════════════════╗
echo ║     СЕРВЕР АВТОПОДТВЕРЖДЕНИЯ ПЛАТЕЖЕЙ - ЗАПУСК              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Проверка Python
echo [1/3] Проверка Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Python не найден!
    echo.
    echo Установите Python: https://www.python.org/
    pause
    exit /b 1
)
echo ✓ Python найден
echo.

REM Установка зависимостей
echo [2/3] Проверка зависимостей...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Устанавливаю зависимости...
    pip install -q fastapi uvicorn requests python-dotenv
    if errorlevel 1 (
        echo ✗ Ошибка установки зависимостей
        pause
        exit /b 1
    )
)
echo ✓ Зависимости готовы
echo.

REM Запуск сервера
echo [3/3] Запуск сервера автоподтверждения...
echo.
echo ════════════════════════════════════════════════════════════════
echo   Сервер работает на: http://localhost:5000
echo   Для остановки нажмите Ctrl+C
echo ════════════════════════════════════════════════════════════════
echo.

python payment_server.py

pause
