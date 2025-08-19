-- Add product_data column to store complete product information
ALTER TABLE public.sunsky_skus 
ADD COLUMN product_data jsonb;