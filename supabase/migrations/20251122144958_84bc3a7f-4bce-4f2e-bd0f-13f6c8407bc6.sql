-- Ensure REPLICA IDENTITY FULL is set for po_orders
-- This ensures complete row data is sent with real-time updates
ALTER TABLE public.po_orders REPLICA IDENTITY FULL;

-- Ensure REPLICA IDENTITY FULL is set for asin_inventory
-- This ensures complete row data is sent with real-time updates
ALTER TABLE public.asin_inventory REPLICA IDENTITY FULL;