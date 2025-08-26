-- Add unique constraint to sunsky_order_items table to fix upsert operations
ALTER TABLE public.sunsky_order_items 
ADD CONSTRAINT sunsky_order_items_unique_item 
UNIQUE (user_id, order_number, sku_code, model_number);