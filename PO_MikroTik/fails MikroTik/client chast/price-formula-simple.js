// ПРОСТАЯ ФОРМУЛА РАСЧЕТА ЦЕНЫ
// Базовая цена: 50 сом за 1 час (60 минут) при скорости 50 Мбит/с

function calculateCustomPriceSimple(durationMinutes, speedMbps) {
    const BASE_PRICE_PER_HOUR = 50;  // 50 сом за час
    const BASE_SPEED = 50;           // Базовая скорость 50 Мбит/с

    // Переводим минуты в часы
    const hours = durationMinutes / 60;

    // Множитель скорости (50 Мбит/с = 1x, 100 Мбит/с = 2x)
    const speedMultiplier = speedMbps / BASE_SPEED;

    // Простой расчет: базовая цена × часы × множитель скорости
    let price = BASE_PRICE_PER_HOUR * hours * speedMultiplier;

    // Округляем до 5 сом
    price = Math.ceil(price / 5) * 5;

    // Минимум 25 сом
    return Math.max(25, price);
}

// ПРИМЕРЫ РАСЧЕТА:
console.log('=== ПРИМЕРЫ ЦЕНООБРАЗОВАНИЯ ===');
console.log('30 мин @ 50 Мбит/с =', calculateCustomPriceSimple(30, 50), 'сом'); // 25 (минимум)
console.log('1 час @ 50 Мбит/с =', calculateCustomPriceSimple(60, 50), 'сом');  // 50
console.log('2 часа @ 50 Мбит/с =', calculateCustomPriceSimple(120, 50), 'сом'); // 100
console.log('3 часа @ 50 Мбит/с =', calculateCustomPriceSimple(180, 50), 'сом'); // 150
console.log('6 часов @ 50 Мбит/с =', calculateCustomPriceSimple(360, 50), 'сом'); // 300
console.log('12 часов @ 50 Мбит/с =', calculateCustomPriceSimple(720, 50), 'сом'); // 600
console.log('24 часа @ 50 Мбит/с =', calculateCustomPriceSimple(1440, 50), 'сом'); // 1200
console.log('');
console.log('1 час @ 10 Мбит/с =', calculateCustomPriceSimple(60, 10), 'сом');  // 25 (минимум)
console.log('1 час @ 25 Мбит/с =', calculateCustomPriceSimple(60, 25), 'сом');  // 25
console.log('1 час @ 50 Мбит/с =', calculateCustomPriceSimple(60, 50), 'сом');  // 50
console.log('1 час @ 75 Мбит/с =', calculateCustomPriceSimple(60, 75), 'сом');  // 75
console.log('1 час @ 100 Мбит/с =', calculateCustomPriceSimple(60, 100), 'сом'); // 100
console.log('');
console.log('2 часа @ 100 Мбит/с =', calculateCustomPriceSimple(120, 100), 'сом'); // 200
console.log('6 часов @ 100 Мбит/с =', calculateCustomPriceSimple(360, 100), 'сом'); // 600
console.log('24 часа @ 100 Мбит/с =', calculateCustomPriceSimple(1440, 100), 'сом'); // 2400
console.log('');
console.log('=== ЛИНЕЙНОЕ ЦЕНООБРАЗОВАНИЕ ===');
console.log('Формула: 50 сом/час × часы × (скорость/50)');
console.log('');
console.log('ПРИМЕЧАНИЕ: Это НАМНОГО дороже для длительных периодов!');
console.log('Сутки @ 100 Мбит/с = 2400 сом (вместо 150 по тарифу)');
console.log('Неделя @ 100 Мбит/с = 16800 сом (вместо 500 по тарифу)');
console.log('');
console.log('РЕКОМЕНДАЦИЯ: Добавить скидки для длительных периодов');
console.log('или пользователи будут выбирать готовые тарифы.');
