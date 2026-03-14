-- 02_seed_gauge_config.sql
-- Cau hinh min/max va nguong canh bao cho Module 2

INSERT INTO gauge_config
(metric_key, display_name, min_value, max_value, unit, warn_low, warn_high)
VALUES
('sensor-temp',  'Temperature', 0, 50, 'C', NULL, 35),
('sensor-humid', 'Humidity',    0, 100, '%', 30, 80),
('sensor-light', 'Light',       0, 1023, 'lux', 200, 900),
('fan',          'Fan Speed',   0, 100, '%', NULL, 80)
ON CONFLICT (metric_key)
DO UPDATE SET
    display_name = EXCLUDED.display_name,
    min_value    = EXCLUDED.min_value,
    max_value    = EXCLUDED.max_value,
    unit         = EXCLUDED.unit,
    warn_low     = EXCLUDED.warn_low,
    warn_high    = EXCLUDED.warn_high;