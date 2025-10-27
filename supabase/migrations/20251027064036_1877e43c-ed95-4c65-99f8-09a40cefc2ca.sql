-- Enable real-time updates for po_orders table
-- This allows instant UI updates without manual refresh

-- Enable REPLICA IDENTITY for full row tracking
ALTER TABLE po_orders REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE po_orders;