-- Add unique constraint for sunsky_credentials to enable upsert operations
ALTER TABLE public.sunsky_credentials ADD CONSTRAINT sunsky_credentials_user_id_unique UNIQUE (user_id);