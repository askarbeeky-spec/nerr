-- ============================================================
-- ДИАГНОСТИКА БОЕВОЙ СИСТЕМЫ RADIUS + BILLING
-- Запусти этот скрипт чтобы увидеть полную картину
-- psql -U postgres -d skybeer_wifi -f diagnose.sql
-- ============================================================

\echo '=== 1. АКТИВНЫЕ ОПЛАЧЕННЫЕ СЕССИИ В BILLING ==='
SELECT
    mac_address,
    tariff_name,
    amount || ' KGS' as paid,
    created_at::timestamp(0) as created,
    expires_at::timestamp(0) as expires,
    EXTRACT(EPOCH FROM (expires_at - NOW()))::INTEGER || 's' as left
FROM billing_sessions
WHERE status = 'active' AND expires_at > NOW()
ORDER BY expires_at DESC;

\echo ''
\echo '=== 2. ЗАПИСИ В RADCHECK (кому RADIUS даёт доступ) ==='
SELECT username as mac, attribute, value
FROM radcheck
ORDER BY username;

\echo ''
\echo '=== 3. ЗАПИСИ В RADREPLY (Session-Timeout по MAC) ==='
SELECT username as mac, attribute, value
FROM radreply
ORDER BY username;

\echo ''
\echo '=== 4. ТАРИФНЫЕ ГРУППЫ (скорости и таймауты) ==='
SELECT groupname, attribute, value
FROM radgroupreply
ORDER BY groupname, attribute;

\echo ''
\echo '=== 5. ГРУППЫ ПОЛЬЗОВАТЕЛЕЙ (какой тариф у какого MAC) ==='
SELECT username as mac, groupname
FROM radusergroup
ORDER BY username;

\echo ''
\echo '=== 6. СРАВНЕНИЕ: есть ли в billing но нет в radcheck? ==='
-- Это критичная проверка: если пользователь оплатил но нет в radcheck → REJECT
SELECT
    bs.mac_address,
    bs.expires_at::timestamp(0) as expires,
    CASE WHEN rc.username IS NOT NULL THEN 'ДА' ELSE 'НЕТ ← ПРОБЛЕМА!' END as in_radcheck,
    CASE WHEN rg.username IS NOT NULL THEN 'ДА' ELSE 'НЕТ ← ПРОБЛЕМА!' END as in_radusergroup
FROM billing_sessions bs
LEFT JOIN radcheck rc ON LOWER(rc.username) = LOWER(bs.mac_address)
LEFT JOIN radusergroup rg ON LOWER(rg.username) = LOWER(bs.mac_address)
WHERE bs.status = 'active' AND bs.expires_at > NOW();

\echo ''
\echo '=== 7. ПОСЛЕДНИЕ RADIUS АВТОРИЗАЦИИ (radpostauth) ==='
SELECT
    username as mac,
    reply as result,
    authdate::timestamp(0) as when,
    nasipaddress as nas
FROM radpostauth
ORDER BY authdate DESC
LIMIT 10;

\echo ''
\echo '=== 8. АКТИВНЫЕ RADIUS СЕССИИ (radacct) ==='
SELECT
    username as mac,
    framedipaddress as ip,
    acctstarttime::timestamp(0) as started,
    acctsessiontime || 's' as duration,
    nasipaddress as nas
FROM radacct
WHERE acctstoptime IS NULL
ORDER BY acctstarttime DESC
LIMIT 10;

\echo ''
\echo '=== 9. ИСТЁКШИЕ ЗАПИСИ В RADCHECK (нужно почистить) ==='
-- MAC в radcheck но сессия уже истекла — мусор, нужно удалить
SELECT
    rc.username as mac,
    rc.attribute,
    'СЕССИЯ ИСТЕКЛА — удалить из radcheck!' as note
FROM radcheck rc
LEFT JOIN billing_sessions bs ON LOWER(bs.mac_address) = LOWER(rc.username)
    AND bs.status = 'active' AND bs.expires_at > NOW()
WHERE bs.id IS NULL;

\echo ''
\echo '=== ДИАГНОСТИКА ЗАВЕРШЕНА ==='
