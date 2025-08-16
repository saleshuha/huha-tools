-- Add store_name column to noon_file_headers table
ALTER TABLE public.noon_file_headers 
ADD COLUMN IF NOT EXISTS store_name TEXT;