-- Enable realtime for export_history table
ALTER TABLE export_history REPLICA IDENTITY FULL;

-- Add export_history to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE export_history;