-- Create table for tracking not found SKUs
CREATE TABLE IF NOT EXISTS public.sunsky_not_found_skus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_number TEXT NOT NULL,
  search_attempts INTEGER DEFAULT 1,
  last_search_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  skip_until TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_user_model UNIQUE(user_id, model_number)
);

-- Create indexes
CREATE INDEX idx_sunsky_not_found_user ON public.sunsky_not_found_skus(user_id);
CREATE INDEX idx_sunsky_not_found_last_search ON public.sunsky_not_found_skus(last_search_date);
CREATE INDEX idx_sunsky_not_found_skip_until ON public.sunsky_not_found_skus(skip_until) WHERE skip_until IS NOT NULL;

-- Enable RLS
ALTER TABLE public.sunsky_not_found_skus ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own not found SKUs"
  ON public.sunsky_not_found_skus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own not found SKUs"
  ON public.sunsky_not_found_skus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own not found SKUs"
  ON public.sunsky_not_found_skus FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own not found SKUs"
  ON public.sunsky_not_found_skus FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sunsky_not_found_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_sunsky_not_found_updated_at
  BEFORE UPDATE ON public.sunsky_not_found_skus
  FOR EACH ROW
  EXECUTE FUNCTION update_sunsky_not_found_updated_at();

-- Add user preferences for not found SKU management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sunsky_skip_not_found BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sunsky_recheck_after_days INTEGER DEFAULT 30;