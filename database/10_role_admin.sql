-- 10_role_admin.sql
-- Allow admin role in addition to user role.

-- Drop the old constraint that only allows role = 'user'
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;

-- Add new constraint allowing both 'user' and 'admin'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'app_users_role_check'
    ) THEN
        ALTER TABLE app_users
        ADD CONSTRAINT app_users_role_check
        CHECK (role IN ('user', 'admin'));
    END IF;
END
$$;
