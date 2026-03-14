-- 03_sample_data.sql
-- Du lieu mau de test UI va DB

-- current_state
INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
VALUES ('sensor-temp', 30.5, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (feed_key)
DO UPDATE SET
    value_num = EXCLUDED.value_num,
    value_text = EXCLUDED.value_text,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
VALUES ('sensor-humid', 67, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (feed_key)
DO UPDATE SET
    value_num = EXCLUDED.value_num,
    value_text = EXCLUDED.value_text,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
VALUES ('sensor-light', 180, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (feed_key)
DO UPDATE SET
    value_num = EXCLUDED.value_num,
    value_text = EXCLUDED.value_text,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
VALUES ('sensor-motion', 1, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (feed_key)
DO UPDATE SET
    value_num = EXCLUDED.value_num,
    value_text = EXCLUDED.value_text,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
VALUES ('fan', 40, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (feed_key)
DO UPDATE SET
    value_num = EXCLUDED.value_num,
    value_text = EXCLUDED.value_text,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
VALUES ('button-light', 1, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (feed_key)
DO UPDATE SET
    value_num = EXCLUDED.value_num,
    value_text = EXCLUDED.value_text,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
VALUES ('button-door', 0, NULL, CURRENT_TIMESTAMP)
ON CONFLICT (feed_key)
DO UPDATE SET
    value_num = EXCLUDED.value_num,
    value_text = EXCLUDED.value_text,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
VALUES ('faceai-result', NULL, 'Khang', CURRENT_TIMESTAMP)
ON CONFLICT (feed_key)
DO UPDATE SET
    value_num = EXCLUDED.value_num,
    value_text = EXCLUDED.value_text,
    updated_at = CURRENT_TIMESTAMP;

-- system_logs
INSERT INTO system_logs (event_name, source, severity, log_details)
VALUES
('AI Unlock', 'ai', 'info', 'Recognized Khang and sent unlock command'),
('Low Light', 'rule-engine', 'warning', 'sensor-light below threshold 200'),
('Light ON', 'web', 'info', 'User turned on light from dashboard'),
('Fan Speed Updated', 'web', 'info', 'Fan speed set to 40 percent'),
('MQTT Reconnected', 'gateway', 'info', 'Gateway reconnected successfully');

-- commands
INSERT INTO commands (feed_key, command_value, source, status, executed_at)
VALUES
('button-light', '1', 'web', 'success', CURRENT_TIMESTAMP),
('button-door', '1', 'ai', 'success', CURRENT_TIMESTAMP),
('fan', '40', 'web', 'success', CURRENT_TIMESTAMP);

-- access_logs
INSERT INTO access_logs (person_name, result, confidence, raw_value)
VALUES
('Khang', 'success', 0.93, 'Khang'),
('unknown', 'denied', 0.41, 'unknown');