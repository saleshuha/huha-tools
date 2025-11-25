-- Create daily_order_tracking table
CREATE TABLE IF NOT EXISTS public.daily_order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sale_date DATE NOT NULL,
  inventory_id UUID NOT NULL REFERENCES asin_inventory(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  sku TEXT,
  title TEXT,
  sold_quantity INTEGER NOT NULL,
  remaining_stock INTEGER NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'ordered', 'skipped')),
  ordered_at TIMESTAMP WITH TIME ZONE,
  sunsky_order_number TEXT,
  skip_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, sale_date, inventory_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_order_tracking_user_date 
  ON public.daily_order_tracking(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_order_tracking_status 
  ON public.daily_order_tracking(user_id, order_status) 
  WHERE order_status = 'pending';

-- Enable RLS
ALTER TABLE public.daily_order_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily orders"
  ON public.daily_order_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily orders"
  ON public.daily_order_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily orders"
  ON public.daily_order_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily orders"
  ON public.daily_order_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get daily sold items needing orders
CREATE OR REPLACE FUNCTION public.get_daily_sold_items_needing_orders(
  target_date DATE DEFAULT CURRENT_DATE,
  country_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  inventory_id UUID,
  asin TEXT,
  sku TEXT,
  title TEXT,
  sold_today INTEGER,
  remaining_stock INTEGER,
  order_status TEXT,
  ordered_at TIMESTAMP WITH TIME ZONE,
  sunsky_order_number TEXT,
  velocity_score NUMERIC,
  recommended_quantity INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH today_sales AS (
    SELECT 
      sc.inventory_id,
      SUM(ABS(sc.change_amount)) as sold_qty
    FROM public.stock_changes sc
    WHERE sc.created_at::date = target_date
      AND sc.change_amount < 0  -- Only sales (negative changes)
    GROUP BY sc.inventory_id
  )
  SELECT 
    ai.id as inventory_id,
    ai.asin,
    ai.sku,
    ai.title,
    COALESCE(ts.sold_qty, 0)::INTEGER as sold_today,
    ai.quantity as remaining_stock,
    COALESCE(dot.order_status, 'pending') as order_status,
    dot.ordered_at,
    dot.sunsky_order_number,
    COALESCE(ai.quantity * 0.5, 1)::NUMERIC as velocity_score,  -- Simplified velocity
    GREATEST(1, COALESCE(ts.sold_qty, 0)::INTEGER) as recommended_quantity
  FROM public.asin_inventory ai
  INNER JOIN today_sales ts ON ts.inventory_id = ai.id
  LEFT JOIN public.daily_order_tracking dot ON (
    dot.inventory_id = ai.id 
    AND dot.sale_date = target_date
    AND dot.user_id = auth.uid()
  )
  WHERE ai.user_id = auth.uid()
    AND ai.quantity > 0  -- Has remaining stock
    AND ai.eligible_for_restock = true  -- Eligible for restock
    AND (country_filter IS NULL OR ai.country = country_filter)
  ORDER BY ts.sold_qty DESC, ai.quantity ASC;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_daily_order_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_daily_order_tracking_updated_at_trigger ON public.daily_order_tracking;
CREATE TRIGGER update_daily_order_tracking_updated_at_trigger
  BEFORE UPDATE ON public.daily_order_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_order_tracking_updated_at();