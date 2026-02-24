
CREATE TABLE public.fba_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asin TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  fnsku TEXT,
  title TEXT,
  condition TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fba_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fba inventory" ON public.fba_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fba inventory" ON public.fba_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fba inventory" ON public.fba_inventory
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_fba_inventory_user_id ON public.fba_inventory(user_id);
CREATE INDEX idx_fba_inventory_asin ON public.fba_inventory(user_id, asin);
