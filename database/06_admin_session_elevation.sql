-- 06_admin_session_elevation.sql
-- Temporary admin mode by session.

ALTER TABLE auth_sessions
ADD COLUMN IF NOT EXISTS elevated_role VARCHAR(20);

ALTER TABLE auth_sessions
ADD COLUMN IF NOT EXISTS elevated_until TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'auth_sessions_elevated_role_check'
    ) THEN
        ALTER TABLE auth_sessions
        ADD CONSTRAINT auth_sessions_elevated_role_check
        CHECK (elevated_role IS NULL OR elevated_role IN ('admin'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_elevated_until
ON auth_sessions(elevated_until);
