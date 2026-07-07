-- ============================================================
-- СХЕМА БД ДЛЯ БОЕВОЙ СИСТЕМЫ
-- База: skybeer_wifi
-- MikroTik Hotspot + FreeRADIUS + MAC-авторизация + биллинг
-- ============================================================

-- 1. Стандартные таблицы FreeRADIUS
CREATE TABLE IF NOT EXISTS radcheck (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',  -- MAC-адрес устройства (нижний регистр)
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radcheck_username ON radcheck(LOWER(username));

CREATE TABLE IF NOT EXISTS radreply (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radreply_username ON radreply(LOWER(username));

CREATE TABLE IF NOT EXISTS radgroupcheck (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radgroupreply (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op CHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radusergroup (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS radusergroup_username ON radusergroup(LOWER(username));

CREATE TABLE IF NOT EXISTS radacct (
    radacctid BIGSERIAL PRIMARY KEY,
    acctsessionid VARCHAR(64) NOT NULL DEFAULT '',
    acctuniqueid VARCHAR(32) NOT NULL DEFAULT '' UNIQUE,
    username VARCHAR(64) NOT NULL DEFAULT '',
    realm VARCHAR(64) DEFAULT '',
    nasipaddress INET NOT NULL,
    nasportid VARCHAR(15) DEFAULT NULL,
    nasporttype VARCHAR(32) DEFAULT NULL,
    acctstarttime TIMESTAMP WITH TIME ZONE,
    acctupdatetime TIMESTAMP WITH TIME ZONE,
    acctstoptime TIMESTAMP WITH TIME ZONE,
    acctinterval INTEGER,
    acctsessiontime INTEGER,
    acctauthentic VARCHAR(32),
    connectinfo_start VARCHAR(50),
    connectinfo_stop VARCHAR(50),
    acctinputoctets BIGINT DEFAULT 0,
    acctoutputoctets BIGINT DEFAULT 0,
    calledstationid VARCHAR(50),
    callingstationid VARCHAR(50),
    acctterminatecause VARCHAR(32),
    servicetype VARCHAR(32),
    framedprotocol VARCHAR(32),
    framedipaddress INET
);
CREATE INDEX IF NOT EXISTS radacct_nasipaddress ON radacct(nasipaddress);
CREATE INDEX IF NOT EXISTS radacct_username ON radacct(LOWER(username));
CREATE INDEX IF NOT EXISTS radacct_framedipaddress ON radacct(framedipaddress);

CREATE TABLE IF NOT EXISTS radpostauth (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    pass VARCHAR(64) NOT NULL DEFAULT '',
    reply VARCHAR(32) NOT NULL DEFAULT '',
    authdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    nasipaddress VARCHAR(15) DEFAULT '',
    nasportid VARCHAR(50) DEFAULT '',
    calledstationid VARCHAR(50) DEFAULT '',
    callingstationid VARCHAR(50) DEFAULT '',
    framedipaddress VARCHAR(15) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS nas (
    id SERIAL PRIMARY KEY,
    nasname VARCHAR(128) NOT NULL,
    shortname VARCHAR(32),
    type VARCHAR(30) DEFAULT 'other',
    ports INTEGER,
    secret VARCHAR(60) NOT NULL DEFAULT 'radius123',
    server VARCHAR(64),
    community VARCHAR(50),
    description VARCHAR(200)
);

-- ============================================================
-- 2. ТАРИФНЫЕ ГРУППЫ RADIUS
-- ВАЖНО: MikroTik использует Mikrotik-Rate-Limit, не WISPr-Bandwidth!
-- Формат: "down_kbps/up_kbps" или "10M/10M"
-- ============================================================

-- Сначала удаляем старые записи (если были WISPr-Bandwidth)
DELETE FROM radgroupreply WHERE groupname IN ('tariff_1hour', 'tariff_1day', 'tariff_custom');

-- Тариф "1 час" — 5 Mbps вниз / 2 Mbps вверх
INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES
('tariff_1hour', 'Session-Timeout',    ':=', '3600'),
('tariff_1hour', 'Idle-Timeout',       ':=', '300'),
('tariff_1hour', 'Mikrotik-Rate-Limit', ':=', '5M/2M')
ON CONFLICT DO NOTHING;

-- Тариф "1 сутки" — 10 Mbps вниз / 5 Mbps вверх
INSERT INTO radgroupreply (groupname, attribute, op, value) VALUES
('tariff_1day', 'Session-Timeout',    ':=', '86400'),
('tariff_1day', 'Idle-Timeout',       ':=', '600'),
('tariff_1day', 'Mikrotik-Rate-Limit', ':=', '10M/5M')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. NAS (MikroTik роутеры) — добавляем обе возможные подсети
-- ============================================================
INSERT INTO nas (nasname, shortname, type, secret, description)
VALUES
    ('192.168.88.1',  'mikrotik-88', 'mikrotik', 'radius123', 'MikroTik основная сеть'),
    ('192.168.50.1',  'mikrotik-50', 'mikrotik', 'radius123', 'MikroTik hotspot сеть 50.x')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. ТАБЛИЦА БИЛЛИНГА
-- paid_until — ключевое поле. RADIUS проверяет: paid_until > NOW()
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_sessions (
    id BIGSERIAL PRIMARY KEY,
    mac_address VARCHAR(17) NOT NULL,          -- MAC в нижнем регистре: aa:bb:cc:dd:ee:ff
    tariff_name VARCHAR(50) NOT NULL,          -- 'tariff_1hour' / 'tariff_1day'
    amount DECIMAL(10,2) NOT NULL,             -- Сумма оплаты
    currency VARCHAR(3) DEFAULT 'KGS',
    payment_method VARCHAR(50),                -- 'mbank', 'visa', 'odengi'
    payment_id VARCHAR(100),                   -- ID транзакции
    status VARCHAR(20) DEFAULT 'active',       -- active / expired / cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,       -- paid_until — когда истекает доступ
    nas_ip VARCHAR(15),                        -- IP MikroTik
    location_name VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS billing_mac ON billing_sessions(LOWER(mac_address));
CREATE INDEX IF NOT EXISTS billing_status ON billing_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS billing_active ON billing_sessions(mac_address, status, expires_at);

-- ============================================================
-- 5. ТАБЛИЦА ТОЧЕК ДОСТУПА
-- ============================================================
CREATE TABLE IF NOT EXISTS access_points (
    id SERIAL PRIMARY KEY,
    nas_ip VARCHAR(15) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    partner_id INTEGER,
    status VARCHAR(20) DEFAULT 'unknown',
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO access_points (nas_ip, name, location)
VALUES
    ('192.168.88.1', 'MikroTik Main (88.x) ', 'Основная точка'),
    ('192.168.50.1', 'MikroTik Hotspot (50.x)', 'Hotspot точка')
ON CONFLICT (nas_ip) DO UPDATE SET name=EXCLUDED.name;

-- ============================================================
-- 6. ВСПОМОГАТЕЛЬНОЕ VIEW: активные платные сессии
-- Удобно для мониторинга и дебага
-- ============================================================
CREATE OR REPLACE VIEW active_paid_sessions AS
SELECT
    bs.mac_address,
    bs.tariff_name,
    bs.amount,
    bs.created_at,
    bs.expires_at,
    bs.nas_ip,
    EXTRACT(EPOCH FROM (bs.expires_at - NOW()))::INTEGER AS seconds_left,
    rc.id AS in_radcheck,
    rg.groupname AS radius_group
FROM billing_sessions bs
LEFT JOIN radcheck rc ON LOWER(rc.username) = LOWER(bs.mac_address)
    AND rc.attribute = 'Auth-Type'
LEFT JOIN radusergroup rg ON LOWER(rg.username) = LOWER(bs.mac_address)
WHERE bs.status = 'active'
    AND bs.expires_at > NOW()
ORDER BY bs.expires_at DESC;

-- ============================================================
-- 7. ФУНКЦИЯ: проверить оплачен ли MAC (используется для диагностики)
-- Вызов: SELECT * FROM check_mac_status('aa:bb:cc:dd:ee:ff');
-- ============================================================
CREATE OR REPLACE FUNCTION check_mac_status(p_mac VARCHAR)
RETURNS TABLE(
    mac VARCHAR,
    has_active_session BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    seconds_left INTEGER,
    in_radcheck BOOLEAN,
    radius_group VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LOWER(p_mac)::VARCHAR as mac,
        (bs.expires_at > NOW()) as has_active_session,
        bs.expires_at,
        EXTRACT(EPOCH FROM (bs.expires_at - NOW()))::INTEGER as seconds_left,
        (rc.id IS NOT NULL) as in_radcheck,
        rg.groupname::VARCHAR as radius_group
    FROM billing_sessions bs
    LEFT JOIN radcheck rc ON LOWER(rc.username) = LOWER(p_mac)
        AND rc.attribute = 'Auth-Type'
    LEFT JOIN radusergroup rg ON LOWER(rg.username) = LOWER(p_mac)
    WHERE LOWER(bs.mac_address) = LOWER(p_mac)
        AND bs.status = 'active'
    ORDER BY bs.expires_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

SELECT 'Database schema created successfully! Boevoy rezhim.' AS result;
