-- Remove the incorrect unique constraint that prevents multiple items per order
DROP INDEX IF EXISTS public.idx_noon_orders_user_order_nr;

-- Keep the correct constraint that allows multiple items per order
-- (noon_orders_unique_order_item_user already exists and is correct)