// ==================== ДЕМО-СКРИПТ ====================
// Этот скрипт добавляет демонстрационные данные для тестирования дизайна
// Вставьте его в консоль браузера (F12) после загрузки страницы

console.log('🎨 Загружаем демо-данные...');

// Демо статистика
appState.stats = {
    total_revenue: 125000,
    partner_commission: 37500,
    active_sessions: 12,
    total_routers: 3
};

appState.partner = {
    id: 'demo_partner_001',
    name: 'Горнолыжная База "Альпы"',
    commission_percent: 30
};

// Демо роутеры
appState.routers = [
    {
        id: 'router_001',
        name: 'Склон А - Вершина',
        location: 'Каракол, База  Тоо-Ашуу',
        status: 'online',
        total_revenue: 45000,
        total_sessions: 85,
        ip_address: '192.168.88.1'
    },
    {
        id: 'router_002',
        name: 'Склон Б - Середина',
        location: 'Каракол, База Тоо-Ашуу',
        status: 'online',
        total_revenue: 38000,
        total_sessions: 67,
        ip_address: '192.168.88.2'
    },
    {
        id: 'router_003',
        name: 'Кафе "Снежинка"',
        location: 'Каракол, База Тоо-Ашуу',
        status: 'offline',
        total_revenue: 42000,
        total_sessions: 93,
        ip_address: '192.168.88.3'
    }
];

// Демо транзакции
appState.transactions = [
    {
        id: 'tx_001',
        created_at: '2026-02-17T10:30:00',
        mac_address: 'AA:BB:CC:DD:EE:01',
        tariff_name: 'Сутки',
        router_id: 'router_001',
        price: 350,
        status: 'confirmed'
    },
    {
        id: 'tx_002',
        created_at: '2026-02-17T10:15:00',
        mac_address: 'AA:BB:CC:DD:EE:02',
        tariff_name: '1 Час',
        router_id: 'router_002',
        price: 50,
        status: 'confirmed'
    },
    {
        id: 'tx_003',
        created_at: '2026-02-17T09:45:00',
        mac_address: 'AA:BB:CC:DD:EE:03',
        tariff_name: 'Неделя',
        router_id: 'router_001',
        price: 2000,
        status: 'confirmed'
    },
    {
        id: 'tx_004',
        created_at: '2026-02-17T09:30:00',
        mac_address: 'AA:BB:CC:DD:EE:04',
        tariff_name: 'Сутки',
        router_id: 'router_003',
        price: 350,
        status: 'pending'
    },
    {
        id: 'tx_005',
        created_at: '2026-02-17T09:00:00',
        mac_address: 'AA:BB:CC:DD:EE:05',
        tariff_name: '1 Час',
        router_id: 'router_002',
        price: 50,
        status: 'confirmed'
    }
];

// Демо активных сессий
appState.activeSessions = [
    { router_id: 'router_001', mac_address: 'AA:BB:CC:DD:EE:06' },
    { router_id: 'router_001', mac_address: 'AA:BB:CC:DD:EE:07' },
    { router_id: 'router_001', mac_address: 'AA:BB:CC:DD:EE:08' },
    { router_id: 'router_002', mac_address: 'AA:BB:CC:DD:EE:09' },
    { router_id: 'router_002', mac_address: 'AA:BB:CC:DD:EE:10' },
    { router_id: 'router_002', mac_address: 'AA:BB:CC:DD:EE:11' },
    { router_id: 'router_002', mac_address: 'AA:BB:CC:DD:EE:12' },
    { router_id: 'router_001', mac_address: 'AA:BB:CC:DD:EE:13' },
    { router_id: 'router_001', mac_address: 'AA:BB:CC:DD:EE:14' },
    { router_id: 'router_002', mac_address: 'AA:BB:CC:DD:EE:15' },
    { router_id: 'router_002', mac_address: 'AA:BB:CC:DD:EE:16' },
    { router_id: 'router_001', mac_address: 'AA:BB:CC:DD:EE:17' }
];

// Обновляем UI
updateStatsCards();
updateTransactionsTable();
updateRoutersGrid();
updateAllTransactionsTable();
loadPartnerInfo();

// Обновляем график с демо-данными
updateRevenueChart([15000, 18000, 16000, 22000, 19000, 25000, 20000]);

// Обновляем прогресс-бары тарифов
const tariffItems = document.querySelectorAll('.tariff-item');
if (tariffItems.length >= 3) {
    tariffItems[0].querySelector('.tariff-count').textContent = '45 продаж';
    tariffItems[0].querySelector('.tariff-progress').style.width = '75%';

    tariffItems[1].querySelector('.tariff-count').textContent = '28 продаж';
    tariffItems[1].querySelector('.tariff-progress').style.width = '45%';

    tariffItems[2].querySelector('.tariff-count').textContent = '12 продаж';
    tariffItems[2].querySelector('.tariff-progress').style.width = '20%';
}

console.log('✅ Демо-данные загружены!');
console.log('📊 Статистика:', appState.stats);
console.log('📡 Роутеры:', appState.routers.length);
console.log('💰 Транзакции:', appState.transactions.length);

// Показываем пример Toast-уведомлений
setTimeout(() => {
    showNotification('Демо-данные успешно загружены! Интерфейс готов к работе.', 'success');
}, 500);

setTimeout(() => {
    showNotification('У вас 12 активных сессий', 'info');
}, 1500);

setTimeout(() => {
    showNotification('Роутер "Кафе Снежинка" оффлайн', 'warning');
}, 2500);
