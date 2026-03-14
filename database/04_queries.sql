-- 04_queries.sql
-- Cac query hay dung cho dashboard

-- 1. Lay cau hinh gauge
SELECT * FROM gauge_config
ORDER BY metric_key;

-- 2. Lay trang thai hien tai
SELECT * FROM current_state
ORDER BY feed_key;

-- 3. Recent Activity / Alert / Log
SELECT id, timestamp, event_name, source, severity, log_details
FROM system_logs
ORDER BY timestamp DESC
LIMIT 20;

-- 4. Lich su lenh dieu khien
SELECT id, feed_key, command_value, source, status, created_at, executed_at
FROM commands
ORDER BY created_at DESC
LIMIT 20;

-- 5. Lich su nhan dien / mo cua
SELECT id, person_name, result, confidence, raw_value, created_at
FROM access_logs
ORDER BY created_at DESC
LIMIT 20;

-- 6. Query ghep gauge + current_state cho UI
SELECT
    g.metric_key,
    g.display_name,
    g.min_value,
    g.max_value,
    g.unit,
    g.warn_low,
    g.warn_high,
    c.value_num,
    c.value_text,
    c.updated_at
FROM gauge_config g
LEFT JOIN current_state c
    ON g.metric_key = c.feed_key
ORDER BY g.metric_key;




SELECT * FROM gauge_config ORDER BY metric_key;
SELECT * FROM current_state ORDER BY feed_key;
SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 20;
SELECT * FROM commands ORDER BY created_at DESC LIMIT 20;
SELECT * FROM access_logs ORDER BY created_at DESC LIMIT 20;