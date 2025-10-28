-- Create table for storing SKU matching patterns for learning
CREATE TABLE IF NOT EXISTS public.sku_match_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  po_sku_pattern TEXT NOT NULL,
  sunsky_sku_pattern TEXT NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  times_used INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sku_match_patterns_user_id ON public.sku_match_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_sku_match_patterns_po_sku ON public.sku_match_patterns(po_sku_pattern);
CREATE INDEX IF NOT EXISTS idx_sku_match_patterns_sunsky_sku ON public.sku_match_patterns(sunsky_sku_pattern);

-- Enable RLS
ALTER TABLE public.sku_match_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own match patterns"
  ON public.sku_match_patterns
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own match patterns"
  ON public.sku_match_patterns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own match patterns"
  ON public.sku_match_patterns
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own match patterns"
  ON public.sku_match_patterns
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sku_match_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_sku_match_patterns_timestamp
  BEFORE UPDATE ON public.sku_match_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_sku_match_patterns_updated_at();