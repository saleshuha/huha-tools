-- Update get_daily_sold_items_needing_orders to accept TEXT for target_date
CREATE OR REPLACE FUNCTION public.get_daily_sold_items_needing_orders(
  target_date TEXT DEFAULT CURRENT_DATE::TEXT,
  country_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  inventory_id UUID,
  asin TEXT,
  sku TEXT,
  title TEXT,
  sold_today BIGINT,
  remaining_stock INTEGER,
  order_status TEXT,
  ordered_at TIMESTAMP WITH TIME ZONE,
  sunsky_order_number TEXT,
  velocity_score NUMERIC,
  recommended_quantity BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH sales_today AS (
    SELECT 
      ai.id as inventory_id,
      ai.asin,
      ai.sku,
      ai.title,
      COUNT(sc.id) as sold_count,
      ai.quantity as remaining_stock
    FROM public.asin_inventory ai
    INNER JOIN public.stock_changes sc ON sc.inventory_id = ai.id
    WHERE sc.created_at::date = target_date::DATE  -- Cast TEXT to DATE
      AND sc.change_amount < 0  -- Stock reductions (sales)
      AND ai.quantity > 0  -- Still has stock remaining
      AND ai.eligible_for_restock = true
      AND ai.user_id = auth.uid()
      AND (country_filter IS NULL OR ai.country = country_filter)
    GROUP BY ai.id, ai.asin, ai.sku, ai.title, ai.quantity
  )
  SELECT 
    st.inventory_id,
    st.asin,
    st.sku,
    st.title,
    st.sold_count as sold_today,
    st.remaining_stock,
    COALESCE(dot.order_status, 'pending') as order_status,
    dot.ordered_at,
    dot.sunsky_order_number,
    0::NUMERIC as velocity_score,
    st.sold_count as recommended_quantity
  FROM sales_today st
  LEFT JOIN public.daily_order_tracking dot ON 
    dot.inventory_id = st.inventory_id 
    AND dot.sale_date = target_date::DATE  -- Cast TEXT to DATE
    AND dot.user_id = auth.uid()
  ORDER BY st.sold_count DESC, st.asin;
END;
$$;