-- Add default_values column to noon_file_headers table
ALTER TABLE public.noon_file_headers 
ADD COLUMN default_values JSONB;