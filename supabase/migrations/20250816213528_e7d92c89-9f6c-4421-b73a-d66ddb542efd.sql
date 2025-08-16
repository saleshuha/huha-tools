-- Add unique constraint for order_id, user_id, and country to support upsert functionality
-- This prevents duplicate orders when importing the same file multiple times
ALTER TABLE public.orders 
ADD CONSTRAINT orders_unique_order_user_country 
UNIQUE (order_id, user_id, country);