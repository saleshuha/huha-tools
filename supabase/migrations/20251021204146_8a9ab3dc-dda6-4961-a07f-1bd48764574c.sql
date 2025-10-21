-- Create optimized replenishment items function
CREATE OR REPLACE FUNCTION public.get_replenishment_items_optimized(
  p_user_id UUID,
  p_country TEXT DEFAULT 'UAE',
  lookback_days INTEGER DEFAULT 365
)
RETURNS TABLE (
  id UUID,
  asin TEXT,
  sku TEXT,
  title TEXT,
  serial_number TEXT,
  quantity INTEGER,
  status inventory_status,
  eligible_for_restock BOOLEAN,
  date_added TIMESTAMPTZ,
  date_sold TIMESTAMPTZ,
  total_stock_in INTEGER,
  total_stock_out INTEGER,
  is_non_source BOOLEAN,
  last_restock_date TIMESTAMPTZ,
  ordered_quantity INTEGER,
  ordered_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stock_changes_agg AS (
    SELECT 
      sc.inventory_id,
      SUM(CASE WHEN sc.change_amount > 0 THEN sc.change_amount ELSE 0 END)::INTEGER as total_in,
      SUM(CASE WHEN sc.change_amount < 0 THEN ABS(sc.change_amount) ELSE 0 END)::INTEGER as total_out
    FROM stock_changes sc
    WHERE sc.created_at >= NOW() - (lookback_days || ' days')::INTERVAL
    GROUP BY sc.inventory_id
  ),
  non_source_check AS (
    SELECT DISTINCT 
      nsi.asin,
      nsi.serial_number
    FROM non_source_items nsi
    WHERE nsi.user_id = p_user_id AND nsi.country = p_country
  )
  SELECT 
    ai.id,
    ai.asin,
    ai.sku,
    ai.title,
    ai.serial_number,
    ai.quantity,
    ai.status,
    ai.eligible_for_restock,
    ai.date_added,
    ai.date_sold,
    COALESCE(sca.total_in, 0) as total_stock_in,
    COALESCE(sca.total_out, 0) as total_stock_out,
    CASE 
      WHEN nsc.asin IS NOT NULL THEN true
      ELSE false
    END as is_non_source,
    ai.last_restock_date,
    ai.ordered_quantity,
    ai.ordered_at
  FROM asin_inventory ai
  LEFT JOIN stock_changes_agg sca ON sca.inventory_id = ai.id
  LEFT JOIN non_source_check nsc ON 
    nsc.asin = ai.asin AND 
    nsc.serial_number = ai.serial_number
  WHERE 
    ai.user_id = p_user_id 
    AND ai.country = p_country
    AND ai.is_active = true
  ORDER BY ai.date_added DESC;
END;
$$;