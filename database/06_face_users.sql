-- Create enum type for status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'face_status') THEN
        CREATE TYPE face_status AS ENUM ('Pending', 'Valid', 'Invalid');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS face_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    face_vector JSONB NOT NULL,
    image_url TEXT NOT NULL,
    status face_status DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
