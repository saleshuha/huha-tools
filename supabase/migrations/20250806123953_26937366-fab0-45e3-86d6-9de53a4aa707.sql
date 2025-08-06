-- Add title and weight columns to sunsky_skus table
ALTER TABLE public.sunsky_skus 
ADD COLUMN title TEXT,
ADD COLUMN weight NUMERIC;