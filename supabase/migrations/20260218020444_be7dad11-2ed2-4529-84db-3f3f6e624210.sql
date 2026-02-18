
-- Create asin_cost_history table
CREATE TABLE public.asin_cost_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asin TEXT NOT NULL,
  sku_code TEXT,
  title TEXT,
  unit_cost DECIMAL(10,2) NOT NULL,
  supplier_name TEXT,
  link_id UUID REFERENCES public.purchase_links(id) ON DELETE SET NULL,
  po_number TEXT,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asin_cost_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cost history" ON public.asin_cost_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cost history" ON public.asin_cost_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cost history" ON public.asin_cost_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cost history" ON public.asin_cost_history FOR DELETE USING (auth.uid() = user_id);
-- Allow edge functions (service role) to insert via anon key for public purchase link updates
CREATE POLICY "Service role can insert cost history" ON public.asin_cost_history FOR INSERT WITH CHECK (true);

CREATE INDEX idx_asin_cost_history_asin ON public.asin_cost_history(asin);
CREATE INDEX idx_asin_cost_history_user_id ON public.asin_cost_history(user_id);
CREATE INDEX idx_asin_cost_history_recorded_date ON public.asin_cost_history(recorded_date);

-- Create purchase_invoices table
CREATE TABLE public.purchase_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES public.purchase_links(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  supplier_name TEXT,
  supplier_order_number TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" ON public.purchase_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own invoices" ON public.purchase_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON public.purchase_invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoices" ON public.purchase_invoices FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_purchase_invoices_user_id ON public.purchase_invoices(user_id);
CREATE INDEX idx_purchase_invoices_link_id ON public.purchase_invoices(link_id);

-- Trigger to auto-update updated_at on purchase_invoices
CREATE TRIGGER update_purchase_invoices_updated_at
BEFORE UPDATE ON public.purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
