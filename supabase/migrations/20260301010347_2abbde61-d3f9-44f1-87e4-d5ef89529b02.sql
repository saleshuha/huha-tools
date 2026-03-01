
-- Create sunsky_product_costs cache table
CREATE TABLE public.sunsky_product_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sku_code TEXT NOT NULL,
  cost NUMERIC,
  title TEXT,
  currency TEXT DEFAULT 'USD',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sku_code)
);

-- Enable RLS
ALTER TABLE public.sunsky_product_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own cached costs"
  ON public.sunsky_product_costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cached costs"
  ON public.sunsky_product_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cached costs"
  ON public.sunsky_product_costs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cached costs"
  ON public.sunsky_product_costs FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_sunsky_product_costs_user_sku ON public.sunsky_product_costs(user_id, sku_code);
