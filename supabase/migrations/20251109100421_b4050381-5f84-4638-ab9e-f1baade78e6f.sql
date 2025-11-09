-- Create stock_receiving_sessions table
CREATE TABLE IF NOT EXISTS public.stock_receiving_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  total_items_received INTEGER DEFAULT 0,
  items_allocated_to_pos INTEGER DEFAULT 0,
  items_added_to_inventory INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_receiving_items table
CREATE TABLE IF NOT EXISTS public.stock_receiving_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.stock_receiving_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Item identification
  asin TEXT,
  sku_code TEXT,
  model_number TEXT,
  serial_number TEXT,
  title TEXT,
  
  -- Quantities
  quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
  quantity_allocated_to_pos INTEGER DEFAULT 0,
  quantity_added_to_inventory INTEGER DEFAULT 0,
  
  -- PO matching results
  matched_pos JSONB DEFAULT '[]'::jsonb,
  has_pending_po BOOLEAN DEFAULT FALSE,
  
  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'completed', 'failed')),
  
  -- Metadata
  supplier_name TEXT,
  receiving_notes TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_stock_receiving_sessions_user_id ON public.stock_receiving_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_receiving_sessions_status ON public.stock_receiving_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_session_id ON public.stock_receiving_items(session_id);
CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_user_id ON public.stock_receiving_items(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_asin ON public.stock_receiving_items(asin);
CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_sku_code ON public.stock_receiving_items(sku_code);
CREATE INDEX IF NOT EXISTS idx_stock_receiving_items_model_number ON public.stock_receiving_items(model_number);

-- Enable RLS
ALTER TABLE public.stock_receiving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_receiving_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_receiving_sessions
CREATE POLICY "Users can view their own receiving sessions"
  ON public.stock_receiving_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receiving sessions"
  ON public.stock_receiving_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receiving sessions"
  ON public.stock_receiving_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receiving sessions"
  ON public.stock_receiving_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for stock_receiving_items
CREATE POLICY "Users can view their own receiving items"
  ON public.stock_receiving_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receiving items"
  ON public.stock_receiving_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receiving items"
  ON public.stock_receiving_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receiving items"
  ON public.stock_receiving_items FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_stock_receiving_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_stock_receiving_sessions_updated_at
  BEFORE UPDATE ON public.stock_receiving_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_receiving_updated_at();

CREATE TRIGGER update_stock_receiving_items_updated_at
  BEFORE UPDATE ON public.stock_receiving_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_receiving_updated_at();