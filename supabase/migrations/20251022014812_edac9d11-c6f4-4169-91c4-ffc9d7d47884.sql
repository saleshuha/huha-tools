-- Add unique constraints to sunsky tables for proper upsert operations

-- Add unique constraint for sunsky_orders table
ALTER TABLE public.sunsky_orders 
DROP CONSTRAINT IF EXISTS sunsky_orders_user_id_number_key;

ALTER TABLE public.sunsky_orders 
ADD CONSTRAINT sunsky_orders_user_id_number_key 
UNIQUE (user_id, number);

-- Add unique constraint for sunsky_order_items table
ALTER TABLE public.sunsky_order_items 
DROP CONSTRAINT IF EXISTS sunsky_order_items_user_id_order_number_sku_code_key;

ALTER TABLE public.sunsky_order_items 
ADD CONSTRAINT sunsky_order_items_user_id_order_number_sku_code_key 
UNIQUE (user_id, order_number, sku_code);