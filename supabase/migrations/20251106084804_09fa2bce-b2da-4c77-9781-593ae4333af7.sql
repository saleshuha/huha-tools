-- Phase 1: Database Schema Improvements for Stock History System
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_changes_inventory ON stock_changes(inventory_id, inventory_type);
CREATE INDEX IF NOT EXISTS idx_stock_changes_created_at ON stock_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_changes_reference ON stock_changes(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_changes_user ON stock_changes(changed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_changes_composite ON stock_changes(user_id, inventory_type, created_at DESC);

-- Add check constraint (with proper error handling)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_change_amount_matches'
  ) THEN
    ALTER TABLE stock_changes 
      ADD CONSTRAINT check_change_amount_matches 
      CHECK (change_amount = (new_quantity - previous_quantity));
  END IF;
END $$;

-- Add columns for enhanced tracking
DO $$ 
BEGIN
  -- Add cost tracking column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'cost_per_unit') THEN
    ALTER TABLE stock_changes ADD COLUMN cost_per_unit NUMERIC(10,2);
  END IF;
  
  -- Add value tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'total_value') THEN
    ALTER TABLE stock_changes ADD COLUMN total_value NUMERIC(10,2);
  END IF;
  
  -- Add warehouse/bin location tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'warehouse_location') THEN
    ALTER TABLE stock_changes ADD COLUMN warehouse_location TEXT;
  END IF;
  
  -- Add tags for categorization
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'tags') THEN
    ALTER TABLE stock_changes ADD COLUMN tags TEXT[];
  END IF;
  
  -- Add approval status for large changes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'approval_status') THEN
    ALTER TABLE stock_changes ADD COLUMN approval_status TEXT DEFAULT 'approved';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'approved_by') THEN
    ALTER TABLE stock_changes ADD COLUMN approved_by UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'approved_at') THEN
    ALTER TABLE stock_changes ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add revert tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'is_reverted') THEN
    ALTER TABLE stock_changes ADD COLUMN is_reverted BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'reverted_by') THEN
    ALTER TABLE stock_changes ADD COLUMN reverted_by UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'stock_changes' AND column_name = 'reverted_at') THEN
    ALTER TABLE stock_changes ADD COLUMN reverted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add comment explaining the schema
COMMENT ON TABLE stock_changes IS 'Comprehensive stock change tracking with cost, approval, and revert capabilities';

-- Enable realtime for stock_changes table
ALTER TABLE stock_changes REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'stock_changes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stock_changes;
  END IF;
END $$;