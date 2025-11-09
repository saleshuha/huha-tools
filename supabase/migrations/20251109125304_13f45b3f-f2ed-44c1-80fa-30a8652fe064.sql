-- Create receiving_history table for comprehensive activity tracking
CREATE TABLE IF NOT EXISTS receiving_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asin TEXT,
  sku_code TEXT,
  model_number TEXT,
  title TEXT,
  quantity INTEGER NOT NULL,
  serial_number TEXT,
  supplier_name TEXT,
  destination_type TEXT NOT NULL,
  destination_details JSONB,
  template_type TEXT,
  printed BOOLEAN DEFAULT false,
  printer_name TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_receiving_history_user_created ON receiving_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receiving_history_asin ON receiving_history(asin);
CREATE INDEX IF NOT EXISTS idx_receiving_history_sku ON receiving_history(sku_code);

-- Enable RLS
ALTER TABLE receiving_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own receiving history"
  ON receiving_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receiving history"
  ON receiving_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);