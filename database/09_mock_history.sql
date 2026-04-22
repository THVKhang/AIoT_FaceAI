-- mock_history.sql
-- Seed data for metric_history
INSERT INTO metric_history (feed_key, value_num, updated_at)
SELECT 
    'sensor-temp', 
    25 + (random() * 10), 
    NOW() - (i || ' hours')::interval
FROM generate_series(1, 168) s(i);

INSERT INTO metric_history (feed_key, value_num, updated_at)
SELECT 
    'sensor-humid', 
    50 + (random() * 30), 
    NOW() - (i || ' hours')::interval
FROM generate_series(1, 168) s(i);

INSERT INTO metric_history (feed_key, value_num, updated_at)
SELECT 
    'sensor-light', 
    200 + (random() * 800), 
    NOW() - (i || ' hours')::interval
FROM generate_series(1, 168) s(i);

-- Seed data for access_logs
INSERT INTO access_logs (person_name, result, confidence, created_at)
SELECT 
    CASE WHEN random() > 0.3 THEN 'User' ELSE 'Unknown' END,
    CASE WHEN random() > 0.3 THEN 'Valid' ELSE 'Stranger' END,
    0.6 + (random() * 0.4),
    NOW() - (i || ' hours')::interval
FROM generate_series(1, 100) s(i);

-- Seed data for commands
INSERT INTO commands (feed_key, command_value, status, created_at)
SELECT 
    CASE WHEN random() > 0.5 THEN 'button-fan' ELSE 'button-door' END,
    CASE WHEN random() > 0.5 THEN 'on' ELSE 'off' END,
    'success',
    NOW() - (i || ' hours')::interval
FROM generate_series(1, 200) s(i);
