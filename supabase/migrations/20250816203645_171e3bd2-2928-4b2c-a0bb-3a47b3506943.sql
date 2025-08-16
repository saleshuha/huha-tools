-- Add locked_headers column to noon_file_headers table
ALTER TABLE public.noon_file_headers 
ADD COLUMN locked_headers text[] DEFAULT ARRAY[]::text[];