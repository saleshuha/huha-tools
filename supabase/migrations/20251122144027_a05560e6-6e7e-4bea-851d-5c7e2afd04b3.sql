-- Enable REPLICA IDENTITY FULL for sku_inventory table
-- This ensures complete row data is sent with real-time updates
ALTER TABLE public.sku_inventory REPLICA IDENTITY FULL;

-- Add sku_inventory to the realtime publication
-- This activates real-time functionality for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sku_inventory;