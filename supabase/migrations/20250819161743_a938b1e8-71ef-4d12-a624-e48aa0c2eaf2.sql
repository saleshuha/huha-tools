-- Add pause/cancel functionality to existing import jobs table
ALTER TABLE public.sunsky_import_jobs 
ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT FALSE;