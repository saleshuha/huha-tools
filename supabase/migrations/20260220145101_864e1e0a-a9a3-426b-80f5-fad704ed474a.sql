
-- Create market_purchases table
CREATE TABLE public.market_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform TEXT NOT NULL DEFAULT 'both' CHECK (platform IN ('amazon', 'noon', 'both', 'po')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed', 'reconciled')),
  notes TEXT,
  total_estimated_cost NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.market_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own market purchases"
  ON public.market_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own market purchases"
  ON public.market_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own market purchases"
  ON public.market_purchases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own market purchases"
  ON public.market_purchases FOR DELETE
  USING (auth.uid() = user_id);

-- Create market_purchase_items table
CREATE TABLE public.market_purchase_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.market_purchases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  asin TEXT,
  sku TEXT,
  title TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  platform TEXT NOT NULL DEFAULT 'both' CHECK (platform IN ('amazon', 'noon', 'both')),
  country TEXT DEFAULT 'AE',
  bill_reconciliation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.market_purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own market purchase items"
  ON public.market_purchase_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own market purchase items"
  ON public.market_purchase_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own market purchase items"
  ON public.market_purchase_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own market purchase items"
  ON public.market_purchase_items FOR DELETE
  USING (auth.uid() = user_id);

-- Create supplier_bills table
CREATE TABLE public.supplier_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  bill_reference TEXT,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AED',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'reconciled', 'disputed')),
  notes TEXT,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own supplier bills"
  ON public.supplier_bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own supplier bills"
  ON public.supplier_bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplier bills"
  ON public.supplier_bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplier bills"
  ON public.supplier_bills FOR DELETE
  USING (auth.uid() = user_id);

-- Add foreign key from market_purchase_items to supplier_bills
ALTER TABLE public.market_purchase_items
  ADD CONSTRAINT fk_bill_reconciliation
  FOREIGN KEY (bill_reconciliation_id) REFERENCES public.supplier_bills(id) ON DELETE SET NULL;

-- Auto-update total_estimated_cost on market_purchases when items change
CREATE OR REPLACE FUNCTION public.update_market_purchase_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.market_purchases
  SET total_estimated_cost = (
    SELECT COALESCE(SUM(quantity * unit_cost), 0)
    FROM public.market_purchase_items
    WHERE purchase_id = COALESCE(NEW.purchase_id, OLD.purchase_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.purchase_id, OLD.purchase_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_purchase_total
AFTER INSERT OR UPDATE OR DELETE ON public.market_purchase_items
FOR EACH ROW EXECUTE FUNCTION public.update_market_purchase_total();

-- Timestamp update function for market_purchases and supplier_bills
CREATE OR REPLACE FUNCTION public.update_updated_at_column_market()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_market_purchases_updated_at
BEFORE UPDATE ON public.market_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_market();

CREATE TRIGGER trg_supplier_bills_updated_at
BEFORE UPDATE ON public.supplier_bills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_market();
