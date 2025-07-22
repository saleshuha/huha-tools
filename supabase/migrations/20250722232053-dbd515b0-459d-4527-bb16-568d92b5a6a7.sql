-- Enable real-time for inventory tables
ALTER TABLE public.asin_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.sku_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.stock_changes REPLICA IDENTITY FULL;

-- Add tables to the realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.asin_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sku_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_changes;