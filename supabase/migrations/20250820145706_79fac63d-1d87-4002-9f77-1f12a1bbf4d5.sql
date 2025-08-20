-- Add columns to existing sunsky_credentials table
ALTER TABLE public.sunsky_credentials 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS last_tested TIMESTAMP WITH TIME ZONE;