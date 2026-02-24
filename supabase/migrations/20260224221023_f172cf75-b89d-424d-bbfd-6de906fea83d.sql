
-- Create shipped_orders table
CREATE TABLE public.shipped_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asin TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  title TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_shipped_orders_user_asin ON public.shipped_orders (user_id, asin);
CREATE INDEX idx_shipped_orders_user_id ON public.shipped_orders (user_id);

-- Enable RLS
ALTER TABLE public.shipped_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own shipped orders"
  ON public.shipped_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shipped orders"
  ON public.shipped_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shipped orders"
  ON public.shipped_orders FOR DELETE
  USING (auth.uid() = user_id);
