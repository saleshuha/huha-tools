-- Add ASIN column to sku_inventory table
ALTER TABLE public.sku_inventory ADD COLUMN asin text;

-- Create unique constraint to prevent duplicate SKU numbers within same user
ALTER TABLE public.sku_inventory ADD CONSTRAINT sku_inventory_user_sku_unique 
UNIQUE (user_id, sku_number);

-- Create unique constraint to prevent duplicate ASIN numbers within same user (when not null)
CREATE UNIQUE INDEX sku_inventory_user_asin_unique 
ON public.sku_inventory (user_id, asin) 
WHERE asin IS NOT NULL AND asin != '';