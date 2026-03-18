-- 01_schema.sql


CREATE TABLE IF NOT EXISTS gauge_config (
    metric_key VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    min_value REAL NOT NULL,
    max_value REAL NOT NULL,
    unit VARCHAR(20),
    warn_low REAL,
    warn_high REAL
);

CREATE TABLE IF NOT EXISTS current_state (
    feed_key VARCHAR(50) PRIMARY KEY,
    value_num REAL,
    value_text TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metric_history (
    id BIGSERIAL PRIMARY KEY,
    feed_key VARCHAR(50) NOT NULL,
    value_num REAL,
    value_text TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_name VARCHAR(100) NOT NULL,
    source VARCHAR(50),
    severity VARCHAR(20) DEFAULT 'info',
    log_details TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commands (
    id SERIAL PRIMARY KEY,
    feed_key VARCHAR(50) NOT NULL,
    command_value VARCHAR(50) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'web',
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    person_name VARCHAR(100),
    result VARCHAR(20) NOT NULL,
    confidence REAL,
    raw_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp
ON system_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_commands_created_at
ON commands(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_logs_created_at
ON access_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_current_state_updated_at
ON current_state(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_metric_history_feed_time
ON metric_history(feed_key, updated_at DESC);