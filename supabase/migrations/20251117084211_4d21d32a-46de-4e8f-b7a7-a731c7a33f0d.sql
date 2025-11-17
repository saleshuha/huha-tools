-- Enable real-time updates for receiving_history table
ALTER TABLE receiving_history REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE receiving_history;