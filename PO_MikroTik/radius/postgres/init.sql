-- =====================================================
-- FreeRADIUS + SkyBeer WiFi: схема БД
-- Логика: MAC в radcheck = оплачен = доступ
--         MAC не в radcheck = не оплачен = Reject
-- =====================================================

-- Стандартные таблицы FreeRADIUS
CREATE TABLE IF NOT EXISTS radcheck (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT ':=',
    value       VARCHAR(253) NOT NULL DEFAULT '',
    created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS radcheck_username ON radcheck (username);

CREATE TABLE IF NOT EXISTS radreply (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '=',
    value       VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS radreply_username ON radreply (username);

CREATE TABLE IF NOT EXISTS radusergroup (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL DEFAULT '',
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    priority    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS radusergroup_username ON radusergroup (username);

CREATE TABLE IF NOT EXISTS radgroupcheck (
    id          SERIAL PRIMARY KEY,
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT ':=',
    value       VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radgroupreply (
    id          SERIAL PRIMARY KEY,
    groupname   VARCHAR(64) NOT NULL DEFAULT '',
    attribute   VARCHAR(64) NOT NULL DEFAULT '',
    op          VARCHAR(2)  NOT NULL DEFAULT '=',
    value       VARCHAR(253) NOT NULL DEFAULT ''
);

-- Таблица активных сессий (accounting)
CREATE TABLE IF NOT EXISTS radacct (
    radacctid           BIGSERIAL PRIMARY KEY,
    acctsessionid       VARCHAR(64)  NOT NULL DEFAULT '',
    acctuniqueid        VARCHAR(32)  NOT NULL DEFAULT '' UNIQUE,
    username            VARCHAR(64)  NOT NULL DEFAULT '',
    realm               VARCHAR(64)  DEFAULT '',
    nasipaddress        VARCHAR(15)  NOT NULL DEFAULT '',
    nasportid           VARCHAR(15)  DEFAULT NULL,
    nasporttype         VARCHAR(32)  DEFAULT NULL,
    acctstarttime       TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    acctstoptime        TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    acctsessiontime     BIGINT       DEFAULT NULL,
    acctauthentic       VARCHAR(32)  DEFAULT NULL,
    connectinfo_start   VARCHAR(50)  DEFAULT NULL,
    connectinfo_stop    VARCHAR(50)  DEFAULT NULL,
    acctinputoctets     BIGINT       DEFAULT NULL,
    acctoutputoctets    BIGINT       DEFAULT NULL,
    calledstationid     VARCHAR(50)  NOT NULL DEFAULT '',
    callingstationid    VARCHAR(50)  NOT NULL DEFAULT '',
    acctterminatecause  VARCHAR(32)  NOT NULL DEFAULT '',
    servicetype         VARCHAR(32)  DEFAULT NULL,
    framedprotocol      VARCHAR(32)  DEFAULT NULL,
    framedipaddress     VARCHAR(15)  NOT NULL DEFAULT ''
);

-- Лог аутентификаций
CREATE TABLE IF NOT EXISTS radpostauth (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(64)  NOT NULL DEFAULT '',
    pass            VARCHAR(64)  NOT NULL DEFAULT '',
    reply           VARCHAR(32)  NOT NULL DEFAULT '',
    authdate        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    nasipaddress    VARCHAR(15)  DEFAULT '',
    nasportid       VARCHAR(15)  DEFAULT NULL,
    calledstationid VARCHAR(50)  DEFAULT NULL,
    callingstationid VARCHAR(50) DEFAULT NULL,
    framedipaddress VARCHAR(15)  DEFAULT NULL
);

-- =====================================================
-- ТАБЛИЦА ПЛАТЕЖЕЙ SKYBEER (бизнес-логика)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id          SERIAL PRIMARY KEY,
    mac_address VARCHAR(20) NOT NULL,
    tariff      VARCHAR(50) NOT NULL DEFAULT 'basic',
    paid_at     TIMESTAMP DEFAULT NOW(),
    expires_at  TIMESTAMP NOT NULL,
    session_minutes INTEGER DEFAULT 60,
    speed_limit VARCHAR(20) DEFAULT '5M/5M',
    is_active   BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS payments_mac ON payments (mac_address);
CREATE INDEX IF NOT EXISTS payments_expires ON payments (expires_at);

-- =====================================================
-- ФУНКЦИЯ: активировать доступ после оплаты
-- Вызывается из Payment API при успешной оплате
-- =====================================================
CREATE OR REPLACE FUNCTION activate_mac_access(
    p_mac VARCHAR(20),
    p_tariff VARCHAR(50),
    p_minutes INTEGER,
    p_speed VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    -- Записываем в payments
    INSERT INTO payments (mac_address, tariff, paid_at, expires_at, session_minutes, speed_limit, is_active)
    VALUES (p_mac, p_tariff, NOW(), NOW() + (p_minutes || ' minutes')::interval, p_minutes, p_speed, true)
    ON CONFLICT DO NOTHING;

    -- Удаляем старый radcheck для этого MAC (если был Reject)
    DELETE FROM radcheck WHERE username = p_mac;
    DELETE FROM radreply WHERE username = p_mac;

    -- Добавляем Access-Accept для этого MAC
    INSERT INTO radcheck (username, attribute, op, value)
    VALUES (p_mac, 'Auth-Type', ':=', 'Accept');

    -- Добавляем атрибуты скорости/времени (MikroTik VSA)
    INSERT INTO radreply (username, attribute, op, value)
    VALUES
        (p_mac, 'Mikrotik-Rate-Limit', '=', p_speed),
        (p_mac, 'Session-Timeout', '=', (p_minutes * 60)::text);

    RAISE NOTICE 'MAC % activated: % for % minutes at %', p_mac, p_tariff, p_minutes, p_speed;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ФУНКЦИЯ: деактивировать (при истечении/отмене)
-- =====================================================
CREATE OR REPLACE FUNCTION deactivate_mac_access(p_mac VARCHAR(20)) RETURNS VOID AS $$
BEGIN
    DELETE FROM radcheck WHERE username = p_mac;
    DELETE FROM radreply WHERE username = p_mac;
    UPDATE payments SET is_active = false WHERE mac_address = p_mac;
    RAISE NOTICE 'MAC % deactivated', p_mac;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW: активные оплаченные сессии
-- =====================================================
CREATE OR REPLACE VIEW active_payments AS
SELECT
    p.mac_address,
    p.tariff,
    p.paid_at,
    p.expires_at,
    p.speed_limit,
    p.session_minutes,
    EXTRACT(EPOCH FROM (p.expires_at - NOW()))/60 AS minutes_left,
    ra.acctsessiontime AS current_session_seconds,
    ra.framedipaddress AS current_ip
FROM payments p
LEFT JOIN radacct ra ON ra.callingstationid = REPLACE(p.mac_address, ':', ':')
    AND ra.acctstoptime IS NULL
WHERE p.is_active = true AND p.expires_at > NOW();

-- =====================================================
-- ТЕСТОВЫЕ ДАННЫЕ: для проверки
-- =====================================================
-- Очищаем старое
DELETE FROM radcheck WHERE username IN ('00:11:22:33:44:55', 'test_mac');
DELETE FROM radreply WHERE username IN ('00:11:22:33:44:55', 'test_mac');

-- Тестовый MAC (оплачен, 60 мин, 5 Мбит/с)
SELECT activate_mac_access('00:11:22:33:44:55', 'basic', 60, '5M/5M');

-- Проверка
SELECT 'radcheck entries:' as info, count(*) FROM radcheck;
SELECT 'radreply entries:' as info, count(*) FROM radreply;
SELECT * FROM radcheck WHERE username = '00:11:22:33:44:55';
SELECT * FROM radreply WHERE username = '00:11:22:33:44:55';
