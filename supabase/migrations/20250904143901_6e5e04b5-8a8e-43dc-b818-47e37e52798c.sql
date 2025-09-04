
-- 1) Add Title column to ASIN inventory
ALTER TABLE public.asin_inventory
ADD COLUMN IF NOT EXISTS title text;

-- 2) Add Title column to SKU inventory
ALTER TABLE public.sku_inventory
ADD COLUMN IF NOT EXISTS title text;
