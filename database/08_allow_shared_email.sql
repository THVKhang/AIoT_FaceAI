-- 08_allow_shared_email.sql
-- Allow multiple accounts to use the same email address.

DO $$
DECLARE
    email_attnum SMALLINT;
    con_record RECORD;
BEGIN
    SELECT attnum
    INTO email_attnum
    FROM pg_attribute
    WHERE attrelid = 'app_users'::regclass
      AND attname = 'email'
      AND NOT attisdropped;

    IF email_attnum IS NULL THEN
        RETURN;
    END IF;

    FOR con_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'app_users'::regclass
          AND contype = 'u'
          AND conkey = ARRAY[email_attnum]
    LOOP
        EXECUTE format('ALTER TABLE app_users DROP CONSTRAINT IF EXISTS %I', con_record.conname);
    END LOOP;
END
$$;

DO $$
DECLARE
    idx_record RECORD;
BEGIN
    FOR idx_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'app_users'
          AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
          AND indexdef ILIKE '%(email)%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', idx_record.indexname);
    END LOOP;
END
$$;

CREATE INDEX IF NOT EXISTS idx_app_users_email
ON app_users(email);
