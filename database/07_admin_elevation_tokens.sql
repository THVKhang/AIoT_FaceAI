-- 07_admin_elevation_tokens.sql
-- One-time tokens used to elevate a user session into temporary admin mode.

CREATE TABLE IF NOT EXISTS admin_elevation_tokens (
    id BIGSERIAL PRIMARY KEY,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    created_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    used_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_elevation_tokens_active
ON admin_elevation_tokens(expires_at, used_at);
