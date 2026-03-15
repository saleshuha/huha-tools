
-- Table: amazon_monthly_sales
CREATE TABLE public.amazon_monthly_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asin text NOT NULL,
  sku text,
  title text,
  country text NOT NULL DEFAULT 'UAE',
  year integer NOT NULL,
  month integer NOT NULL,
  shipped_qty integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, asin, country, year, month)
);

ALTER TABLE public.amazon_monthly_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monthly sales"
  ON public.amazon_monthly_sales FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: amazon_monthly_upload_locks
CREATE TABLE public.amazon_monthly_upload_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  country text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  total_asins integer DEFAULT 0,
  total_qty integer DEFAULT 0,
  locked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, country, year, month)
);

ALTER TABLE public.amazon_monthly_upload_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own upload locks"
  ON public.amazon_monthly_upload_locks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
