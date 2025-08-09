-- Remove SKUs without titles from the database
-- This will delete all records where title is null, empty string, or only whitespace
DELETE FROM public.sunsky_skus 
WHERE title IS NULL 
   OR title = '' 
   OR trim(title) = '';