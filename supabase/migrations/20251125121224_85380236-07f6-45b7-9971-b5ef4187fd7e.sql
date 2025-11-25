-- Drop and recreate the function to use stock_changes for actual sales tracking
DROP FUNCTION IF EXISTS public.get_daily_sold_items_needing_orders(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_daily_sold_items_needing_orders(
  target_date TEXT DEFAULT CURRENT_DATE::TEXT,
  country_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  inventory_id UUID,
  asin TEXT,
  sku TEXT,
  title TEXT,
  sold_today INTEGER,
  remaining_stock INTEGER,
  order_status TEXT,
  ordered_at TIMESTAMPTZ,
  sunsky_order_number TEXT,
  velocity_score NUMERIC,
  recommended_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id as inventory_id,
    ai.asin,
    ai.sku,
    ai.title,
    ABS(SUM(sc.change_amount))::INTEGER as sold_today,
    ai.quantity as remaining_stock,
    COALESCE(dot.order_status, 'pending')::TEXT as order_status,
    dot.ordered_at,
    dot.sunsky_order_number,
    COALESCE(ai.velocity_score, 0)::NUMERIC as velocity_score,
    GREATEST(ABS(SUM(sc.change_amount)), 1)::INTEGER as recommended_quantity
  FROM public.asin_inventory ai
  INNER JOIN public.stock_changes sc ON ai.asin = sc.asin AND ai.id = sc.inventory_id
  LEFT JOIN public.daily_order_tracking dot 
    ON ai.id = dot.inventory_id AND dot.sale_date = target_date::DATE
  WHERE ai.user_id = auth.uid()
    AND (country_filter IS NULL OR ai.country = country_filter)
    AND ai.quantity > 0
    AND ai.eligible_for_restock = true
    AND sc.change_amount < 0
    AND sc.created_at::DATE = target_date::DATE
  GROUP BY ai.id, ai.asin, ai.sku, ai.title, ai.quantity, ai.velocity_score, 
           dot.order_status, dot.ordered_at, dot.sunsky_order_number
  ORDER BY ABS(SUM(sc.change_amount)) DESC;
END;
$$;