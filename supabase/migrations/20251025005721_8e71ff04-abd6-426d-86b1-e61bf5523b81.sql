-- Enable realtime for background_tasks table
ALTER TABLE background_tasks REPLICA IDENTITY FULL;

-- Add table to realtime publication (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'background_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE background_tasks;
  END IF;
END $$;