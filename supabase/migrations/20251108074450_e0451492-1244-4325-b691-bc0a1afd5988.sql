-- Drop the old redundant unique constraint on orders table
-- This constraint was preventing upsert operations from working correctly
-- We keep the newer orders_unique_order_user_country constraint which allows
-- the same order_id to exist across different countries (UAE/KSA)

ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_order_id_user_id_key;