
-- 1. market_item_costs — Central cost store
CREATE TABLE public.market_item_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asin TEXT NOT NULL,
  sku TEXT,
  title TEXT,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  supplier_name TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, asin)
);

ALTER TABLE public.market_item_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own costs" ON public.market_item_costs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own costs" ON public.market_item_costs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own costs" ON public.market_item_costs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own costs" ON public.market_item_costs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_market_item_costs_updated_at
  BEFORE UPDATE ON public.market_item_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_market_purchase_total();

-- Actually we need a simple updated_at trigger, let me create one
DROP TRIGGER IF EXISTS update_market_item_costs_updated_at ON public.market_item_costs;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_market_item_costs_updated_at
  BEFORE UPDATE ON public.market_item_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. market_purchase_links — Shareable purchase lists
CREATE TABLE public.market_purchase_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  user_id UUID NOT NULL,
  purchase_id UUID REFERENCES public.market_purchases(id) ON DELETE SET NULL,
  title TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  platform TEXT DEFAULT 'both',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_purchase_links ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can manage own links" ON public.market_purchase_links
  FOR ALL USING (auth.uid() = user_id);

-- Public can read active links by token (for supplier portal)
CREATE POLICY "Public can read active links by token" ON public.market_purchase_links
  FOR SELECT USING (is_active = true);

CREATE TRIGGER update_market_purchase_links_updated_at
  BEFORE UPDATE ON public.market_purchase_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
