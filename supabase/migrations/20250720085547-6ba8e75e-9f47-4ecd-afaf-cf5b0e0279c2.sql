-- Update all existing inventory items to have quantity=1 and min_stock_level=1
UPDATE public.asin_inventory 
SET quantity = 1, min_stock_level = 1;

UPDATE public.sku_inventory 
SET quantity = 1, min_stock_level = 1;