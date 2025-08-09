-- Remove description and notes columns from sunsky_skus table
ALTER TABLE public.sunsky_skus 
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS notes;