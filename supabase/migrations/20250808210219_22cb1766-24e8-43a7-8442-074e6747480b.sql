-- Remove the foreign key constraint that's preventing PO order insertions
-- PO orders should be able to exist independently of the sunsky_skus catalog

-- Drop the foreign key constraint
ALTER TABLE public.po_orders 
DROP CONSTRAINT IF EXISTS fk_po_orders_sunsky_skus;

-- Also drop any other potential foreign key constraints on sku_code or sku_user_id that might be blocking insertions
ALTER TABLE public.po_orders 
DROP CONSTRAINT IF EXISTS po_orders_sku_code_fkey;

ALTER TABLE public.po_orders 
DROP CONSTRAINT IF EXISTS po_orders_sku_user_id_fkey;