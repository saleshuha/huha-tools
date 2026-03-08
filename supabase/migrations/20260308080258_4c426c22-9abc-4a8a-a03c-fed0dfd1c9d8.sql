
-- Add API credential columns to noon_stores_config
ALTER TABLE public.noon_stores_config 
  ADD COLUMN IF NOT EXISTS api_private_key TEXT,
  ADD COLUMN IF NOT EXISTS api_key_id TEXT,
  ADD COLUMN IF NOT EXISTS api_project_code TEXT,
  ADD COLUMN IF NOT EXISTS warehouse_code TEXT;

-- Create noon_fbpi_orders table
CREATE TABLE public.noon_fbpi_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.noon_stores_config(id) ON DELETE SET NULL,
  fbpi_order_nr TEXT NOT NULL,
  mp_order_nr TEXT,
  mp_code TEXT,
  mp_country_code TEXT,
  warehouse_code TEXT,
  currency_code TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  inventory_status JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'fetched',
  order_created_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.noon_fbpi_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for noon_fbpi_orders
CREATE POLICY "Users can view their own fbpi orders"
  ON public.noon_fbpi_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fbpi orders"
  ON public.noon_fbpi_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fbpi orders"
  ON public.noon_fbpi_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fbpi orders"
  ON public.noon_fbpi_orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
