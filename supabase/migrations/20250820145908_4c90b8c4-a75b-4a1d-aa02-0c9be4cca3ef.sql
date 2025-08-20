-- Drop the unique constraint on user_id to allow multiple API keys per user
ALTER TABLE public.sunsky_credentials 
DROP CONSTRAINT IF EXISTS sunsky_credentials_user_id_unique;

-- Instead, create a unique constraint on user_id + name combination to prevent duplicate names per user
ALTER TABLE public.sunsky_credentials 
ADD CONSTRAINT sunsky_credentials_user_id_name_unique UNIQUE (user_id, name);