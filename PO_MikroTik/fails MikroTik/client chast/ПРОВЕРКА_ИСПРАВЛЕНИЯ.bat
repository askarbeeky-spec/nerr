@echo off
cls
color 0A
echo ================================================
echo   ИСПРАВЛЕНИЕ: Селекты теперь кликабельны!
echo ================================================
echo.
echo Что было исправлено:
echo [+] pointer-events: none для overlay
echo [+] z-index для всех элементов
echo [+] position: relative для контролов
echo.
echo ================================================
echo.
echo Сейчас откроется index.html
echo.
echo ЧТО ДЕЛАТЬ:
echo 1. Нажмите Ctrl+Shift+R (жёсткая перезагрузка)
echo 2. Прокрутите вниз до карточки "Настроить"
echo 3. Кликните на селект "Время"
echo 4. Выберите другое значение (например 2 часа)
echo 5. Кликните на селект "Скорость"
echo 6. Выберите другое значение (например 100 Мбит/с)
echo.
echo РЕЗУЛЬТАТ:
echo    Цена должна обновиться автоматически!
echo.
echo Если F12 открыта, увидите логи:
echo    "Duration changed to: 120"
echo    "Price updated to: XXX сом"
echo.
pause
start "" "index.html"
