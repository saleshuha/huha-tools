-- Add SKU column to asin_inventory table
ALTER TABLE public.asin_inventory 
ADD COLUMN sku text;