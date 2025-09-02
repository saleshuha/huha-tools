-- Update noon_orders table to use purchase_item_nr as unique identifier
-- First make purchase_item_nr NOT NULL since it will be the unique identifier
ALTER TABLE public.noon_orders 
ALTER COLUMN purchase_item_nr SET NOT NULL;

-- Add unique constraint on purchase_item_nr and user_id combination
ALTER TABLE public.noon_orders 
ADD CONSTRAINT noon_orders_purchase_item_nr_user_id_key 
UNIQUE (purchase_item_nr, user_id);

-- Remove any existing unique constraint on order_nr if it exists
-- (This will fail silently if the constraint doesn't exist)
DO $$ 
BEGIN
    ALTER TABLE public.noon_orders DROP CONSTRAINT IF EXISTS noon_orders_order_nr_key;
    ALTER TABLE public.noon_orders DROP CONSTRAINT IF EXISTS noon_orders_order_nr_user_id_key;
EXCEPTION 
    WHEN OTHERS THEN 
        NULL; -- Ignore errors if constraints don't exist
END $$;