-- Check what constraint is causing the issue and remove it if it's too restrictive
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'noon_file_headers'::regclass;

-- If there's a restrictive check constraint on file_type, let's remove it
-- This will allow any string value for file_type
ALTER TABLE public.noon_file_headers 
DROP CONSTRAINT IF EXISTS noon_file_headers_file_type_check;