// ==================== CONFIGURATION ====================
const CONFIG = {
    API_URL: 'http://192.168.88.254:5000/api',
    PARTNER_ID: 'partner_demo_001',  // ID партнера
    REFRESH_INTERVAL: 30000,  // 30 секунд автообновления
    DEBUG: true
};

// ==================== STATE ====================
let appState = {
    partner: null,
    routers: [],
    transactions: [],
    stats: null,
    activeSessions: [],
    refreshTimer: null
};

// ==================== UTILITY FUNCTIONS ====================
function log(...args) {
    if (CONFIG.DEBUG) {
        console.log('[Dashboard]', ...args);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return `${Math.round(amount)} сом`;
}

// ==================== TOAST NOTIFICATION SYSTEM ====================
let toastContainer = null;

function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

function showNotification(message, type = 'success', title = '') {
    initToastContainer();

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const titles = {
        success: title || 'Успешно',
        error: title || 'Ошибка',
        warning: title || 'Внимание',
        info: title || 'Информация'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">×</button>
    `;

    toastContainer.appendChild(toast);

    // Auto close
    const autoCloseTimer = setTimeout(() => {
        removeToast(toast);
    }, 5000);

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(autoCloseTimer);
        removeToast(toast);
    });

    log(`Toast [${type}]:`, message);
}

function removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// ==================== NAVIGATION ====================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const targetPage = item.dataset.page;

            // Обновляем активный пункт меню
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Показываем нужную страницу
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(`${targetPage}Page`).classList.add('active');

            // Обновляем заголовок
            const titles = {
                'dashboard': 'Дашборд',
                'routers': 'Роутеры',
                'transactions': 'Транзакции',
                'analytics': 'Аналитика',
                'settings': 'Настройки'
            };
            document.getElementById('pageTitle').textContent = titles[targetPage] || targetPage;

            log('Navigated to:', targetPage);
        });
    });
}

// ==================== CLOCK ====================
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeString;
}

// ==================== DATA LOADING ====================
async function loadPartnerStats() {
    try {
        log('Loading partner stats...');

        const response = await fetch(`${CONFIG.API_URL}/partner/${CONFIG.PARTNER_ID}/stats`);

        if (!response.ok) {
            throw new Error('Failed to load stats');
        }

        const data = await response.json();
        appState.stats = data.stats;
        appState.partner = data.partner;
        appState.transactions = data.recent_transactions || [];

        log('Stats loaded:', data);

        // Обновляем UI
        updateStatsCards();
        updateTransactionsTable();

    } catch (error) {
        log('Error loading stats:', error);
        // Показываем демо-данные при ошибке
        showDemoStats();
    }
}

async function loadRouters() {
    try {
        log('Loading routers...');

        const response = await fetch(`${CONFIG.API_URL}/partner/${CONFIG.PARTNER_ID}/routers`);

        if (!response.ok) {
            throw new Error('Failed to load routers');
        }

        const data = await response.json();
        appState.routers = data.routers || [];

        log('Routers loaded:', data);

        // Обновляем UI
        updateRoutersGrid();

    } catch (error) {
        log('Error loading routers:', error);
    }
}

async function loadActiveSessions() {
    try {
        log('Loading active sessions...');

        const response = await fetch(`${CONFIG.API_URL}/sessions/active`);

        if (!response.ok) {
            throw new Error('Failed to load sessions');
        }

        const data = await response.json();

        // Фильтруем только сессии партнера
        appState.activeSessions = (data.sessions || []).filter(s =>
            appState.routers.some(r => r.id === s.router_id)
        );

        log('Active sessions:', appState.activeSessions);

    } catch (error) {
        log('Error loading sessions:', error);
    }
}

// ==================== UI UPDATES ====================
function updateStatsCards() {
    const stats = appState.stats || {
        total_revenue: 0,
        partner_commission: 0,
        active_sessions: 0,
        total_routers: 0
    };

    document.getElementById('totalRevenue').textContent = formatCurrency(stats.total_revenue);
    document.getElementById('partnerCommission').textContent = formatCurrency(stats.partner_commission);
    document.getElementById('activeSessions').textContent = stats.active_sessions || appState.activeSessions.length;
    document.getElementById('totalRouters').textContent = stats.total_routers;

    // Обновляем процент комиссии
    if (appState.partner) {
        document.getElementById('commissionPercent').textContent = `${appState.partner.commission_percent}%`;
    }

    // Обновляем количество онлайн роутеров
    const onlineRouters = appState.routers.filter(r => r.status === 'online').length;
    document.getElementById('routersOnline').textContent = `${onlineRouters} онлайн`;
}

function updateTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');

    if (!appState.transactions || appState.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Нет транзакций</td></tr>';
        return;
    }

    tbody.innerHTML = appState.transactions.slice(0, 5).map(t => `
        <tr>
            <td>${formatDate(t.created_at)}</td>
            <td><code>${t.mac_address}</code></td>
            <td>${t.tariff_name}</td>
            <td>${t.router_id}</td>
            <td><strong>${formatCurrency(t.price)}</strong></td>
            <td><span class="status-badge ${t.status}">${t.status === 'confirmed' ? 'Оплачено' : 'Ожидание'}</span></td>
        </tr>
    `).join('');
}

function updateRoutersGrid() {
    const grid = document.getElementById('routersGrid');

    if (!appState.routers || appState.routers.length === 0) {
        grid.innerHTML = `
            <div class="router-card placeholder">
                <div class="router-icon">📡</div>
                <h4>Нет роутеров</h4>
                <p>Добавьте первый роутер</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = appState.routers.map(router => {
        const status = router.status || 'offline';
        const sessions = appState.activeSessions.filter(s => s.router_id === router.id).length;

        return `
            <div class="router-card">
                <div class="router-status ${status}"></div>
                <div class="router-icon">📡</div>
                <h4>${router.name}</h4>
                <p>${router.location}</p>
                <div class="router-stats">
                    <div class="router-stat">
                        <div class="router-stat-value">${sessions}</div>
                        <div class="router-stat-label">Активные</div>
                    </div>
                    <div class="router-stat">
                        <div class="router-stat-value">${formatCurrency(router.total_revenue || 0)}</div>
                        <div class="router-stat-label">Доход</div>
                    </div>
                    <div class="router-stat">
                        <div class="router-stat-value">${router.total_sessions || 0}</div>
                        <div class="router-stat-label">Сессий</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateAllTransactionsTable() {
    const tbody = document.getElementById('allTransactionsBody');

    if (!appState.transactions || appState.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Нет транзакций</td></tr>';
        return;
    }

    const partnerCommission = appState.partner?.commission_percent || 30;

    tbody.innerHTML = appState.transactions.map(t => {
        const commission = (t.price * partnerCommission / 100).toFixed(2);

        return `
            <tr>
                <td><code>${t.id?.substring(0, 8) || 'N/A'}</code></td>
                <td>${formatDate(t.created_at)}</td>
                <td><code>${t.mac_address}</code></td>
                <td>${t.tariff_name}</td>
                <td>${t.router_id}</td>
                <td><strong>${formatCurrency(t.price)}</strong></td>
                <td><span style="color: var(--success)">${commission} сом</span></td>
                <td><span class="status-badge ${t.status}">${t.status === 'confirmed' ? 'Оплачено' : 'Ожидание'}</span></td>
            </tr>
        `;
    }).join('');
}

function showDemoStats() {
    // Демо-данные для отображения когда API недоступен
    appState.stats = {
        total_revenue: 0,
        partner_commission: 0,
        active_sessions: 0,
        total_routers: 1
    };

    appState.partner = {
        id: CONFIG.PARTNER_ID,
        name: 'Demo Partner',
        commission_percent: 30
    };

    appState.routers = [{
        id: 'router_demo_001',
        name: 'Demo Router - Склон А',
        location: 'Каракол, база Тоо-Ашуу',
        status: 'offline',
        total_revenue: 0,
        total_sessions: 0
    }];

    updateStatsCards();
    updateRoutersGrid();
}

// ==================== ROUTER MANAGEMENT ====================
function setupRouterManagement() {
    const addBtn = document.getElementById('addRouterBtn');
    const closeBtn = document.getElementById('closeRouterModal');
    const submitBtn = document.getElementById('submitRouterBtn');
    const modal = document.getElementById('addRouterModal');

    addBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    submitBtn.addEventListener('click', async () => {
        await addNewRouter();
    });
}

async function addNewRouter() {
    const routerId = document.getElementById('routerId').value;
    const routerName = document.getElementById('routerName').value;
    const routerLocation = document.getElementById('routerLocation').value;
    const routerIP = document.getElementById('routerIP').value;

    if (!routerId || !routerName || !routerLocation) {
        showNotification('Заполните все обязательные поля', 'error');
        return;
    }

    try {
        log('Adding new router...');

        const response = await fetch(`${CONFIG.API_URL}/partner/router/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                router_id: routerId,
                name: routerName,
                location: routerLocation,
                partner_id: CONFIG.PARTNER_ID,
                ip_address: routerIP || null
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to add router');
        }

        const data = await response.json();
        log('Router added:', data);

        showNotification('Роутер успешно добавлен!', 'success');

        // Закрываем модальное окно
        document.getElementById('addRouterModal').classList.remove('active');

        // Очищаем форму
        document.getElementById('routerId').value = '';
        document.getElementById('routerName').value = '';
        document.getElementById('routerLocation').value = '';
        document.getElementById('routerIP').value = '';

        // Обновляем данные
        await refreshData();

    } catch (error) {
        log('Error adding router:', error);
        showNotification('Ошибка при добавлении роутера: ' + error.message, 'error');
    }
}

window.closeAddRouterModal = function () {
    document.getElementById('addRouterModal').classList.remove('active');
};

// ==================== REFRESH ====================
async function refreshData() {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('loading');

    try {
        await Promise.all([
            loadPartnerStats(),
            loadRouters(),
            loadActiveSessions()
        ]);

        // Обновляем таблицу транзакций на странице транзакций
        updateAllTransactionsTable();

        log('Data refreshed');
    } catch (error) {
        log('Error refreshing data:', error);
    } finally {
        btn.classList.remove('loading');
    }
}

function setupAutoRefresh() {
    // Останавливаем предыдущий таймер если есть
    if (appState.refreshTimer) {
        clearInterval(appState.refreshTimer);
    }

    // Запускаем автообновление
    appState.refreshTimer = setInterval(async () => {
        log('Auto-refresh...');
        await refreshData();
    }, CONFIG.REFRESH_INTERVAL);
}

// ==================== SETTINGS ====================
function setupSettings() {
    if (appState.partner) {
        document.getElementById('settingsName').value = appState.partner.name || '';
        document.getElementById('settingsCommission').value = appState.partner.commission_percent || 30;
    }
}

// ==================== PARTNER INFO ====================
async function loadPartnerInfo() {
    try {
        // В реальной системе здесь будет загрузка данных партнера
        // Пока используем демо-данные
        const partnerName = appState.partner?.name || 'Demo Partner';
        document.getElementById('partnerName').textContent = partnerName;

        log('Partner info loaded');
    } catch (error) {
        log('Error loading partner info:', error);
    }
}

// ==================== INITIALIZATION ====================
async function init() {
    log('Initializing dashboard...');

    // Настраиваем навигацию
    setupNavigation();

    // Запускаем часы
    updateClock();
    setInterval(updateClock, 1000);

    // Загружаем данные
    await refreshData();

    // Загружаем информацию о партнере
    await loadPartnerInfo();

    // Настраиваем управление роутерами
    setupRouterManagement();

    // Настраиваем кнопку обновления
    document.getElementById('refreshBtn').addEventListener('click', refreshData);

    // Запускаем автообновление
    setupAutoRefresh();

    // Настраиваем настройки
    setupSettings();

    // Инициализируем графики
    initCharts();

    log('Dashboard initialized');
}

// ==================== CHARTS ====================
let revenueChart = null;

function initCharts() {
    const revenueCtx = document.getElementById('revenueChart');

    if (!revenueCtx) {
        log('Revenue chart canvas not found');
        return;
    }

    // Gradient для графика
    const ctx = revenueCtx.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0)');

    // Демо-данные для графика
    const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const data = [0, 0, 0, 0, 0, 0, 0];

    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Доход (сом)',
                data: data,
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 31, 53, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(102, 126, 234, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y + ' сом';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return value + ' сом';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    log('Charts initialized');
}

function updateRevenueChart(data) {
    if (!revenueChart) return;

    revenueChart.data.datasets[0].data = data;
    revenueChart.update();
}

// ==================== START APPLICATION ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ==================== CLEANUP ====================
window.addEventListener('beforeunload', () => {
    if (appState.refreshTimer) {
        clearInterval(appState.refreshTimer);
    }
});

// ==================== DEBUG ====================
if (CONFIG.DEBUG) {
    window.DASHBOARD_DEBUG = {
        state: appState,
        config: CONFIG,
        refresh: refreshData,
        loadStats: loadPartnerStats,
        loadRouters: loadRouters,
        showToast: (msg, type) => showNotification(msg, type),
        updateChart: updateRevenueChart
    };
    log('Debug mode enabled. Access via window.DASHBOARD_DEBUG');
}

// ==================== RADIUS MANAGEMENT ====================

async function loadRadiusStats() {
    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/radius/stats`);
        const data = await res.json();
        const el = (id) => document.getElementById(id);
        if (el('radiusTotalUsers')) el('radiusTotalUsers').textContent = data.total_radius_users || 0;
        if (el('radiusActiveSessions')) el('radiusActiveSessions').textContent = data.active_sessions || 0;
        if (el('radiusTodayRevenue')) el('radiusTodayRevenue').textContent = `${data.today_revenue || 0} сом`;
    } catch (e) {
        log('RADIUS stats error:', e);
    }
}

async function loadRadiusUsers() {
    const tbody = document.getElementById('radiusUsersBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">Загрузка...</td></tr>';
    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/radius/users`);
        const data = await res.json();
        if (!data.users || data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">Нет пользователей в RADIUS</td></tr>';
            return;
        }
        tbody.innerHTML = data.users.map(u => {
            const expires = u.expires_at ? new Date(u.expires_at).toLocaleString('ru-RU') : '—';
            let minutesLeft = 0;
            if (u.expires_at) {
                const diff = new Date(u.expires_at) - new Date();
                if (diff > 0) minutesLeft = Math.ceil(diff / 1000 / 60);
            }

            const statusBadge = u.billing_status === 'active'
                ? '<span style="color:#10b981;font-weight:600">● Активен</span>'
                : '<span style="color:#94a3b8">○ ' + (u.billing_status || 'нет сессии') + '</span>';
            return `<tr>
                <td style="font-family:monospace;font-size:13px">${u.mac}</td>
                <td>${u.tariff_name}</td>
                <td>${u.amount} сом</td>
                <td style="font-size:12px">${expires}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex;gap:5px">
                        <button onclick="modifySessionTime('${u.mac}', ${minutesLeft})"
                            style="padding:4px 8px;background:#3b82f6;border:none;border-radius:6px;color:white;cursor:pointer;font-size:12px"
                            title="Изменить время">
                            ⏱️ +/-
                        </button>
                        <button onclick="revokeAndDisconnect('${u.mac}')"
                            style="padding:4px 8px;background:#ef4444;border:none;border-radius:6px;color:white;cursor:pointer;font-size:12px"
                            title="Отозвать доступ">
                            🚫
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Ошибка: ${e.message}</td></tr>`;
    }
}

async function modifySessionTime(mac, currentMinutes) {
    const input = prompt(`У пользователя ${mac} осталось сейчас ${currentMinutes} минут.\n\nВведите сколько минут добавить (полож. число) или убавить (отриц. число):`);

    if (input === null) return; // Cancelled

    const minutes = parseInt(input);
    if (isNaN(minutes)) {
        alert('Пожалуйста, введите корректное число.');
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/radius/modify_time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mac_address: mac, minutes: minutes })
        });

        const data = await res.json();

        if (res.ok) {
            showNotification(data.message, 'success');
            loadRadiusUsers(); // Refresh table
        } else {
            showNotification(data.detail || 'Ошибка изменения времени', 'error');
        }
    } catch (e) {
        showNotification('Ошибка сети: ' + e.message, 'error');
    }
}

async function adminGrantAccess() {
    const mac = document.getElementById('grantMac')?.value?.trim();
    const tariff = document.getElementById('grantTariff')?.value;
    const resultEl = document.getElementById('grantResult');
    if (!mac) { resultEl.textContent = '❌ Введите MAC-адрес'; resultEl.style.color = '#ef4444'; return; }
    const durationMap = { hour: 60, day: 1440, week: 10080 };
    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/radius/grant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mac_address: mac, tariff_type: tariff, duration_minutes: durationMap[durationMap[tariff] ? tariff : 'hour'] })
        });
        const data = await res.json();
        resultEl.textContent = '✅ ' + data.message;
        resultEl.style.color = '#10b981';
        document.getElementById('grantMac').value = '';
        setTimeout(() => loadRadiusUsers(), 500);
    } catch (e) {
        resultEl.textContent = '❌ Ошибка: ' + e.message;
        resultEl.style.color = '#ef4444';
    }
}

async function revokeAndDisconnect(mac) {
    if (!confirm(`Отозвать доступ для ${mac}?`)) return;
    try {
        const res = await fetch(`${CONFIG.API_URL}/admin/radius/revoke/${encodeURIComponent(mac)}`, { method: 'DELETE' });
        const data = await res.json();
        showNotification(data.message, 'success');
        setTimeout(() => loadRadiusUsers(), 500);
        loadRadiusStats();
    } catch (e) {
        showNotification('Ошибка: ' + e.message, 'error');
    }
}

// Загружаем RADIUS данные при переходе на страницу
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', function () {
            const page = this.dataset.page;
            if (page === 'radius') {
                loadRadiusStats();
                loadRadiusUsers();
            }
        });
    });
});

