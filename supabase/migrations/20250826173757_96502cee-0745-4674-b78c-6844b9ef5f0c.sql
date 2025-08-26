
-- Fix unique constraint for sunsky_order_items to match upsert target

-- 1) Drop the previously added constraint (if present)
ALTER TABLE public.sunsky_order_items
  DROP CONSTRAINT IF EXISTS sunsky_order_items_unique_item;

-- 2) Add a new user-scoped unique constraint that matches the planned onConflict
ALTER TABLE public.sunsky_order_items
  ADD CONSTRAINT sunsky_order_items_user_order_sku_key
  UNIQUE (user_id, order_number, sku_code);
