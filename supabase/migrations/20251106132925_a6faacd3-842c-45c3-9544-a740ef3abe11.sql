-- Enable realtime for purchase_updates table
ALTER TABLE purchase_updates REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_updates;