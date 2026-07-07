-- ============================================================
-- ОЧИСТКА ИСТЁКШИХ СЕССИЙ ИЗ RADIUS ТАБЛИЦ
-- Запускать периодически (или через cron/Task Scheduler)
-- psql -U postgres -d skybeer_wifi -f cleanup_expired.sql
-- ============================================================

BEGIN;

-- 1. Находим MAC у которых сессия истекла (или вообще нет активной сессии)
--    и удаляем их из radcheck (RADIUS начнёт возвращать Reject)
DELETE FROM radcheck
WHERE LOWER(username) IN (
    SELECT LOWER(username) FROM radcheck
    EXCEPT
    SELECT LOWER(mac_address) FROM billing_sessions
    WHERE status = 'active' AND expires_at > NOW()
)
RETURNING username as deleted_from_radcheck;

-- 2. Удаляем из radreply (Session-Timeout)
DELETE FROM radreply
WHERE LOWER(username) IN (
    SELECT LOWER(username) FROM radreply
    EXCEPT
    SELECT LOWER(mac_address) FROM billing_sessions
    WHERE status = 'active' AND expires_at > NOW()
)
RETURNING username as deleted_from_radreply;

-- 3. Удаляем из radusergroup (тарифная группа)
DELETE FROM radusergroup
WHERE LOWER(username) IN (
    SELECT LOWER(username) FROM radusergroup
    EXCEPT
    SELECT LOWER(mac_address) FROM billing_sessions
    WHERE status = 'active' AND expires_at > NOW()
)
RETURNING username as deleted_from_radusergroup;

-- 4. Помечаем истёкшие billing_sessions как expired
UPDATE billing_sessions
SET status = 'expired'
WHERE status = 'active' AND expires_at <= NOW()
RETURNING mac_address, expires_at as expired_at;

COMMIT;

SELECT 'Cleanup complete' AS result, NOW() AS run_at;
