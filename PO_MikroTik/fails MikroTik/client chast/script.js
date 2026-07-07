// ==================== CONFIGURATION ====================
const CONFIG = {
    // URL платежного API (ваш сервер)
    API_URL: 'http://192.168.88.254:5000/api',

    // ID точки доступа (MikroTik 192.168.88.1)
    ROUTER_ID: 'router_demo_001',

    // Debugging (отключить в production)
    DEBUG: true
};

// ==================== STATE ====================
let appState = {
    deviceMac: null,
    selectedTariff: null,
    selectedPaymentMethod: 'card',
    sessionData: null
};

// ==================== UTILITY FUNCTIONS ====================
function log(...args) {
    if (CONFIG.DEBUG) {
        console.log('[SKY Internet]', ...args);
    }
}

// ==================== TOAST NOTIFICATION SYSTEM ====================
let toastContainer = null;

function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;
        document.body.appendChild(toastContainer);
    }
}

function showToast(message, type = 'info') {
    initToastContainer();

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const colors = {
        success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        min-width: 300px;
        padding: 16px 20px;
        background: ${colors[type]};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
    `;

    toast.innerHTML = `
        <span style="font-size: 24px;">${icons[type]}</span>
        <span style="flex: 1;">${message}</span>
    `;

    toast.onclick = () => removeToast(toast);
    toastContainer.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast) {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Add keyframe animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

function showError(message) {
    showToast(message, 'error');
    log('ERROR:', message);
}

function showSuccess(message) {
    showToast(message, 'success');
    log('SUCCESS:', message);
}

// ==================== MAC ADDRESS DETECTION ====================
const MAC_STORAGE_KEY = 'sky_device_mac';
const MAC_EXPIRY_KEY = 'sky_device_mac_expiry';
const MAC_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

function saveMacToStorage(mac) {
    try {
        localStorage.setItem(MAC_STORAGE_KEY, mac);
        localStorage.setItem(MAC_EXPIRY_KEY, Date.now() + MAC_TTL_MS);
        log('MAC saved to localStorage:', mac);
    } catch (e) {
        log('localStorage unavailable:', e);
    }
}

function loadMacFromStorage() {
    try {
        const expiry = parseInt(localStorage.getItem(MAC_EXPIRY_KEY) || '0');
        if (Date.now() > expiry) {
            localStorage.removeItem(MAC_STORAGE_KEY);
            localStorage.removeItem(MAC_EXPIRY_KEY);
            return null;
        }
        return localStorage.getItem(MAC_STORAGE_KEY);
    } catch (e) {
        return null;
    }
}

function getDeviceMac() {
    // 1. Сначала смотрим URL — MikroTik передаёт MAC при первом подключении
    const urlParams = new URLSearchParams(window.location.search);
    const macFromUrl = urlParams.get('mac') || urlParams.get('MAC') || urlParams.get('mac-address');

    if (macFromUrl && macFromUrl !== '$(mac)' && macFromUrl.length >= 12) {
        const mac = macFromUrl.toUpperCase();
        saveMacToStorage(mac);  // Сохраняем — будет доступен при перезагрузке
        return mac;
    }

    // 2. URL без MAC (перезагрузка страницы) — читаем из localStorage
    const savedMac = loadMacFromStorage();
    if (savedMac) {
        log('MAC loaded from localStorage:', savedMac);
        return savedMac;
    }

    // 3. В режиме отладки — генерируем постоянный тестовый MAC (не случайный!)
    if (CONFIG.DEBUG) {
        const testMac = 'AA:BB:CC:DD:EE:FF';
        saveMacToStorage(testMac);
        log('DEBUG: using test MAC:', testMac);
        return testMac;
    }

    return null;
}

function generateRandomMac() {
    const hexDigits = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
        mac += hexDigits[Math.floor(Math.random() * 16)];
        mac += hexDigits[Math.floor(Math.random() * 16)];
        if (i < 5) mac += ':';
    }
    return mac;
}

function formatMac(mac) {
    if (!mac) return 'Неизвестно';
    // Форматируем как XX:XX:XX:XX:XX:XX
    return mac.match(/.{1,2}/g)?.join(':') || mac;
}

// ==================== SESSION CHECK ====================

async function resolveDeviceMac() {
    /**
     * Определяем MAC устройства:
     * 1. Из URL (?mac=...) — MikroTik передаёт при первом визите
     * 2. Из localStorage — при перезагрузке страницы
     * 3. По IP адресу — запрос к API (для прямого захода на /portal/)
     */
    let mac = getDeviceMac();

    // Если MAC из URL/localStorage — это уже настоящий MAC
    const urlParams = new URLSearchParams(window.location.search);
    const macFromUrl = urlParams.get('mac');
    const isValidMac = mac && mac !== 'AA:BB:CC:DD:EE:FF' &&
        mac !== '$(MAC)' && mac.length === 17;

    if (isValidMac) {
        return mac;
    }

    // MAC неизвестен или тестовый — пробуем найти по IP
    try {
        log('No real MAC in URL/storage, trying IP lookup...');
        const res = await fetch(`${CONFIG.API_URL}/check-session-by-ip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_ip: null })  // сервер берёт IP из request
        });
        const data = await res.json();
        if (data.mac) {
            log('✅ MAC resolved by IP:', data.mac);
            saveMacToStorage(data.mac);
            return data.mac;
        }
    } catch (e) {
        log('IP lookup failed:', e);
    }

    // Возвращаем то что есть (тестовый или null)
    return mac;
}

async function checkExistingSession(mac) {
    try {
        // Если MAC = $(mac) — MikroTik не заменил переменную (login.html не загружен)
        if (!mac || mac === '$(MAC)' || mac.includes('$(')) {
            log('⚠️ MAC not resolved — login.html not on MikroTik');
            return false;
        }

        log('Checking existing session for MAC:', mac);

        const response = await fetch(`${CONFIG.API_URL}/check-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mac_address: mac,
                router_id: CONFIG.ROUTER_ID
            })
        });

        if (!response.ok) throw new Error('Session check failed');

        const data = await response.json();
        log('Session check result:', data);

        if (data.active_session) {
            showWelcomeBack(data);
            return true;
        }

        return false;

    } catch (error) {
        log('Session check error:', error);
        return false;
    }
}


// ==================== REDIRECT TO MIKROTIK ====================
function redirectToLogin() {
    const mac = appState.deviceMac;
    if (!mac) {
        showError('MAC-адрес не определен. Попробуйте обновить страницу.');
        return;
    }

    log('Redirecting to MikroTik login for MAC:', mac);

    const mikrotikHost = '192.168.50.1';
    const mikrotikLoginUrl = `http://${mikrotikHost}/login?username=${encodeURIComponent(mac)}&password=radius123`;

    showToast('Подключаемся к интернету...', 'info');

    // Шаг 1: Скрытый iframe — пробуем авторизоваться без смены страницы
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = mikrotikLoginUrl;
    document.body.appendChild(iframe);

    // Шаг 2: Через 1.5 сек делаем полный редирект
    // Это критично для ПК — браузер должен явно перейти на страницу логина
    setTimeout(() => {
        window.location.href = mikrotikLoginUrl;
    }, 1500);
}

function showWelcomeBack(sessionData) {
    const welcomeSection = document.getElementById('welcomeSection');
    const expiryDate = new Date(sessionData.expires_at);

    // Используем время от сервера если есть, иначе считаем сами
    let minutesLeft = sessionData.minutes_left;
    if (minutesLeft === undefined || minutesLeft === null) {
        const now = new Date();
        minutesLeft = Math.round((expiryDate - now) / 1000 / 60);
    }

    welcomeSection.innerHTML = `
        <div class="welcome-content">
            <h1 class="welcome-title">С возвращением! 🎉</h1>
            <p class="welcome-subtitle">Ваш доступ активен</p>
            
            <div class="active-session-info">
                <div class="session-card">
                    <div class="session-icon">✅</div>
                    <div class="session-details">
                        <h3>Тариф: ${sessionData.tariff_name}</h3>
                        <p>Осталось: <strong>${minutesLeft} минут</strong></p>
                        <p>Действует до: <strong>${expiryDate.toLocaleString('ru-RU')}</strong></p>
                    </div>
                </div>
                
                <button class="connect-button" onclick="redirectToLogin()" style="background: var(--gradient-primary); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; margin-bottom: 12px; width: 100%; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                    Войти в интернет
                </button>
                
                <button class="extend-button" onclick="scrollToTariffs()" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 12px; cursor: pointer; width: 100%;">
                    Продлить доступ
                </button>
            </div>
        </div>
    `;
}

function scrollToTariffs() {
    document.querySelector('.tariffs-section').scrollIntoView({
        behavior: 'smooth'
    });
}

// ==================== TARIFF SELECTION ====================
function setupTariffSelection() {
    const tariffCards = document.querySelectorAll('.tariff-card');

    tariffCards.forEach(card => {
        const button = card.querySelector('.tariff-button');

        button.addEventListener('click', (e) => {
            e.stopPropagation();

            // Собираем данные тарифа
            appState.selectedTariff = {
                name: card.querySelector('.tariff-name').textContent,
                price: parseInt(card.dataset.price),
                duration: parseInt(card.dataset.duration),
                type: card.dataset.tariff
            };

            log('Selected tariff:', appState.selectedTariff);

            // Открываем модальное окно оплаты
            openPaymentModal();
        });
    });
}

// ==================== CUSTOM TARIFF ====================
function calculateCustomPrice(durationMinutes, speedMbps) {
    // Базовые тарифы для расчета
    const baseTariffs = {
        hour: { minutes: 60, speed: 50, price: 50 },
        day: { minutes: 1440, speed: 100, price: 150 },
        week: { minutes: 10080, speed: 100, price: 500 }
    };

    // Нормализуем по времени (цена за минуту)
    const pricePerMinute = {
        hour: baseTariffs.hour.price / baseTariffs.hour.minutes,
        day: baseTariffs.day.price / baseTariffs.day.minutes,
        week: baseTariffs.week.price / baseTariffs.week.minutes
    };

    // Выбираем оптимальный базовый тариф
    let baseRate;
    if (durationMinutes <= 60) {
        baseRate = pricePerMinute.hour;
    } else if (durationMinutes <= 1440) {
        baseRate = pricePerMinute.day;
    } else {
        baseRate = pricePerMinute.week;
    }

    // Рассчитываем базовую цену по времени
    let price = baseRate * durationMinutes;

    // Множитель скорости (50 Мбит/с - базовая)
    const speedMultiplier = speedMbps / 50;
    price *= speedMultiplier;

    // Применяем скидку за длительность
    if (durationMinutes >= 4320) { // 3+ дней
        price *= 0.7; // 30% скидка
    } else if (durationMinutes >= 1440) { // 1+ день
        price *= 0.8; // 20% скидка
    } else if (durationMinutes >= 360) { // 6+ часов
        price *= 0.9; // 10% скидка
    }

    // Округляем до 5 сом
    price = Math.ceil(price / 5) * 5;

    // Минимум 25 сом
    return Math.max(25, price);
}

function updateCustomPrice() {
    const durationSelect = document.getElementById('customDuration');
    const speedSelect = document.getElementById('customSpeed');
    const priceElement = document.getElementById('customPrice');

    if (!durationSelect || !speedSelect || !priceElement) {
        return;
    }

    const duration = parseInt(durationSelect.value);
    const speed = parseInt(speedSelect.value);

    const price = calculateCustomPrice(duration, speed);

    const priceAmount = priceElement.querySelector('.price-amount');
    if (priceAmount) {
        // Анимация изменения цены
        priceElement.style.animation = 'none';
        setTimeout(() => {
            priceAmount.textContent = price;
            priceElement.style.animation = '';
        }, 10);
    }

    log('Custom tariff price updated:', { duration, speed, price });
}

function setupCustomTariff() {
    const durationSelect = document.getElementById('customDuration');
    const speedSelect = document.getElementById('customSpeed');
    const customButton = document.getElementById('customTariffButton');

    if (!durationSelect || !speedSelect || !customButton) {
        log('Custom tariff not found on page');
        return;
    }

    // Обновляем цену при изменении настроек
    durationSelect.addEventListener('change', updateCustomPrice);
    speedSelect.addEventListener('change', updateCustomPrice);

    // Инициализируем начальную цену
    updateCustomPrice();

    // Обработчик кнопки выбора
    customButton.addEventListener('click', (e) => {
        e.stopPropagation();

        const duration = parseInt(durationSelect.value);
        const speed = parseInt(speedSelect.value);
        const price = calculateCustomPrice(duration, speed);

        // Генерируем название тарифа
        let durationText = '';
        if (duration < 60) {
            durationText = `${duration} минут`;
        } else if (duration < 1440) {
            const hours = Math.round(duration / 60);
            durationText = `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
        } else {
            const days = Math.round(duration / 1440);
            durationText = `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
        }

        appState.selectedTariff = {
            name: `Свой тариф (${durationText}, ${speed} Мбит/с)`,
            price: price,
            duration: duration,
            speed: speed,
            type: 'custom'
        };

        log('Selected custom tariff:', appState.selectedTariff);

        // Открываем модальное окно оплаты
        openPaymentModal();
    });
}

// ==================== PAYMENT MODAL ====================
function openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const tariff = appState.selectedTariff;

    // Обновляем информацию в модальном окне
    document.getElementById('selectedTariffName').textContent = tariff.name;
    document.getElementById('selectedTariffPrice').textContent = tariff.price;
    document.getElementById('payButtonAmount').textContent = `${tariff.price} сом`;

    // Показываем модальное окно
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    log('Payment modal opened');
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';

    log('Payment modal closed');
}

function setupPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const closeBtn = document.getElementById('modalClose');

    // Закрытие по кнопке
    closeBtn.addEventListener('click', closePaymentModal);

    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePaymentModal();
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closePaymentModal();
        }
    });
}

// ==================== PAYMENT METHODS ====================
function setupPaymentMethods() {
    const methods = document.querySelectorAll('.payment-method');

    methods.forEach(method => {
        method.addEventListener('click', () => {
            // Убираем active у всех
            methods.forEach(m => m.classList.remove('active'));

            // Добавляем active к выбранному
            method.classList.add('active');

            // Сохраняем выбранный метод
            appState.selectedPaymentMethod = method.dataset.method;

            log('Selected payment method:', appState.selectedPaymentMethod);
        });
    });
}

// ==================== PAYMENT PROCESSING ====================
async function processPayment() {
    const payButton = document.getElementById('payButton');
    const tariff = appState.selectedTariff;
    const mac = appState.deviceMac;

    if (!mac) {
        showError('Не удалось определить MAC-адрес устройства');
        return;
    }

    // Показываем состояние загрузки
    payButton.classList.add('loading');
    payButton.disabled = true;

    try {
        log('Processing payment...', {
            mac,
            tariff,
            paymentMethod: appState.selectedPaymentMethod
        });

        // Отправляем запрос на оплату
        const response = await fetch(`${CONFIG.API_URL}/process-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mac_address: mac,
                router_id: CONFIG.ROUTER_ID,
                tariff_type: tariff.type,
                tariff_name: tariff.name,
                price: tariff.price,
                duration_minutes: tariff.duration,
                payment_method: appState.selectedPaymentMethod
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Payment failed');
        }

        const data = await response.json();
        log('Payment successful:', data);

        // Сохраняем данные сессии
        appState.sessionData = data;

        // Закрываем модальное окно оплаты
        closePaymentModal();

        // Показываем модальное окно успеха
        showSuccessModal(data);

        // Отправляем данные партнеру (если API настроен)
        sendDataToPartner(data);

    } catch (error) {
        log('Payment error:', error);
        showError('Ошибка оплаты: ' + error.message);
    } finally {
        payButton.classList.remove('loading');
        payButton.disabled = false;
    }
}

function setupPaymentButton() {
    const payButton = document.getElementById('payButton');
    payButton.addEventListener('click', processPayment);
}

// ==================== SUCCESS MODAL ====================
function showSuccessModal(sessionData) {
    const modal = document.getElementById('successModal');
    const expiryDate = new Date(sessionData.expires_at);

    // Обновляем информацию
    document.getElementById('successTariff').textContent = sessionData.tariff_name;
    document.getElementById('successExpiry').textContent = expiryDate.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Показываем модальное окно
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    log('Success modal shown');
}

// ==================== PARTNER DATA SYNC ====================
async function sendDataToPartner(sessionData) {
    try {
        log('Sending data to partner dashboard...');

        const response = await fetch(`${CONFIG.API_URL}/partner/session-created`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                router_id: CONFIG.ROUTER_ID,
                session_id: sessionData.session_id,
                mac_address: sessionData.mac_address,
                tariff_name: sessionData.tariff_name,
                price: sessionData.price,
                duration_minutes: sessionData.duration_minutes,
                created_at: sessionData.created_at,
                expires_at: sessionData.expires_at
            })
        });

        if (response.ok) {
            log('Data sent to partner successfully');
        } else {
            log('Failed to send data to partner');
        }

    } catch (error) {
        log('Error sending data to partner:', error);
        // Не показываем ошибку пользователю, т.к. это не критично
    }
}

// ==================== ANIMATION HELPERS ====================
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

// ==================== INITIALIZATION ====================
async function init() {
    log('Initializing SKY Internet Captive Portal...');

    // Получаем MAC-адрес: URL → localStorage → IP lookup
    appState.deviceMac = await resolveDeviceMac();
    log('Device MAC:', appState.deviceMac);

    // Отображаем MAC-адрес
    const deviceMacElement = document.getElementById('deviceMac');
    if (deviceMacElement) {
        deviceMacElement.textContent = formatMac(appState.deviceMac);
    }

    // Проверяем существующую сессию
    if (appState.deviceMac) {
        await checkExistingSession(appState.deviceMac);
    }

    // Настраиваем обработчики событий
    setupTariffSelection();
    setupCustomTariff();
    setupPaymentModal();
    setupPaymentMethods();
    setupPaymentButton();

    log('Initialization complete');
}

// ==================== START APPLICATION ====================
// Запускаем приложение после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ==================== GLOBAL ERROR HANDLER ====================
window.addEventListener('error', (event) => {
    log('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    log('Unhandled promise rejection:', event.reason);
});

// Экспортируем для отладки
if (CONFIG.DEBUG) {
    window.SKY_DEBUG = {
        state: appState,
        config: CONFIG,
        checkSession: () => checkExistingSession(appState.deviceMac),
        testPayment: () => processPayment()
    };
    log('Debug mode enabled. Access via window.SKY_DEBUG');
}
