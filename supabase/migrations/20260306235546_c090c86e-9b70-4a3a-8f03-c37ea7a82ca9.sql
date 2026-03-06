
DROP FUNCTION IF EXISTS public.get_comprehensive_performance_analysis(text);

CREATE OR REPLACE FUNCTION public.get_comprehensive_performance_analysis(country_filter text DEFAULT NULL)
RETURNS TABLE (
  item_id uuid,
  asin text,
  sku text,
  title text,
  current_quantity integer,
  total_units_sold_lifetime bigint,
  total_units_restocked bigint,
  po_units_sold bigint,
  b2b_units_sold bigint,
  first_stock_date timestamptz,
  last_sale_date timestamptz,
  first_sale_date timestamptz,
  days_in_inventory integer,
  avg_days_to_sellout numeric,
  sales_velocity_7d numeric,
  sales_velocity_30d numeric,
  sales_velocity_90d numeric,
  sales_velocity_lifetime numeric,
  turnover_ratio numeric,
  performance_score integer,
  performance_category text,
  stock_days_remaining numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH stock_changes_agg AS (
    SELECT 
      sc.inventory_id,
      COALESCE(SUM(CASE WHEN sc.change_amount > 0 THEN sc.change_amount ELSE 0 END), 0) as total_added,
      COALESCE(ABS(SUM(CASE WHEN sc.change_amount < 0 THEN sc.change_amount ELSE 0 END)), 0) as total_sold,
      COALESCE(ABS(SUM(CASE WHEN sc.change_amount < 0 AND sc.reference_type = 'po_order' THEN sc.change_amount ELSE 0 END)), 0) as po_sold,
      COALESCE(ABS(SUM(CASE WHEN sc.change_amount < 0 AND sc.reference_type IN ('manual', 'sale') THEN sc.change_amount ELSE 0 END)), 0) as b2b_sold,
      MIN(CASE WHEN sc.change_amount > 0 THEN sc.created_at END) as first_stock_date,
      MAX(CASE WHEN sc.change_amount < 0 THEN sc.created_at END) as last_sale_date,
      MIN(CASE WHEN sc.change_amount < 0 THEN sc.created_at END) as first_sale_date,
      COALESCE(ABS(SUM(CASE WHEN sc.change_amount < 0 AND sc.created_at >= now() - interval '7 days' THEN sc.change_amount ELSE 0 END)), 0) as sales_7d,
      COALESCE(ABS(SUM(CASE WHEN sc.change_amount < 0 AND sc.created_at >= now() - interval '30 days' THEN sc.change_amount ELSE 0 END)), 0) as sales_30d,
      COALESCE(ABS(SUM(CASE WHEN sc.change_amount < 0 AND sc.created_at >= now() - interval '90 days' THEN sc.change_amount ELSE 0 END)), 0) as sales_90d,
      COUNT(CASE WHEN sc.change_amount > 0 THEN 1 END) as restock_count
    FROM public.stock_changes sc
    INNER JOIN public.asin_inventory ai ON ai.id = sc.inventory_id
    WHERE ai.user_id = auth.uid()
      AND (country_filter IS NULL OR ai.country = country_filter)
    GROUP BY sc.inventory_id
  ),
  sellout_times AS (
    SELECT 
      sc.inventory_id,
      AVG(
        CASE 
          WHEN sc.change_amount < 0 AND prev_stock.created_at IS NOT NULL 
          THEN EXTRACT(epoch FROM (sc.created_at - prev_stock.created_at)) / 86400.0
          ELSE NULL 
        END
      ) as avg_sellout_days
    FROM public.stock_changes sc
    LEFT JOIN LATERAL (
      SELECT sc2.created_at 
      FROM public.stock_changes sc2 
      WHERE sc2.inventory_id = sc.inventory_id 
        AND sc2.change_amount > 0 
        AND sc2.created_at < sc.created_at
      ORDER BY sc2.created_at DESC
      LIMIT 1
    ) prev_stock ON true
    INNER JOIN public.asin_inventory ai ON ai.id = sc.inventory_id
    WHERE sc.change_amount < 0
      AND ai.user_id = auth.uid()
      AND (country_filter IS NULL OR ai.country = country_filter)
    GROUP BY sc.inventory_id
  )
  SELECT 
    ai.id as item_id,
    ai.asin,
    ai.sku,
    ai.title,
    ai.quantity as current_quantity,
    COALESCE(sca.total_sold, 0)::bigint as total_units_sold_lifetime,
    COALESCE(sca.total_added, 0)::bigint as total_units_restocked,
    COALESCE(sca.po_sold, 0)::bigint as po_units_sold,
    COALESCE(sca.b2b_sold, 0)::bigint as b2b_units_sold,
    COALESCE(sca.first_stock_date, ai.created_at) as first_stock_date,
    sca.last_sale_date,
    sca.first_sale_date,
    EXTRACT(days FROM now() - COALESCE(sca.first_stock_date, ai.created_at))::integer as days_in_inventory,
    COALESCE(st.avg_sellout_days, 0)::numeric as avg_days_to_sellout,
    CASE WHEN 7 > 0 THEN COALESCE(sca.sales_7d, 0) / 7.0 ELSE 0 END::numeric as sales_velocity_7d,
    CASE WHEN 30 > 0 THEN COALESCE(sca.sales_30d, 0) / 30.0 ELSE 0 END::numeric as sales_velocity_30d,
    CASE WHEN 90 > 0 THEN COALESCE(sca.sales_90d, 0) / 90.0 ELSE 0 END::numeric as sales_velocity_90d,
    CASE 
      WHEN EXTRACT(days FROM now() - COALESCE(sca.first_stock_date, ai.created_at)) > 0 
      THEN COALESCE(sca.total_sold, 0) / EXTRACT(days FROM now() - COALESCE(sca.first_stock_date, ai.created_at))
      ELSE 0 
    END::numeric as sales_velocity_lifetime,
    CASE 
      WHEN COALESCE(sca.total_added, 0) > 0 
      THEN (COALESCE(sca.total_sold, 0)::numeric / sca.total_added::numeric)
      ELSE 0 
    END::numeric as turnover_ratio,
    CASE 
      WHEN COALESCE(sca.total_sold, 0) = 0 THEN 0
      ELSE LEAST(100, GREATEST(0, (
        (CASE 
          WHEN COALESCE(sca.sales_30d, 0) > 0 
          THEN (COALESCE(sca.sales_7d, 0) / 7.0) / (COALESCE(sca.sales_30d, 0) / 30.0) * 40
          WHEN COALESCE(sca.sales_7d, 0) > 0 THEN 40
          ELSE 10
        END) +
        (CASE 
          WHEN COALESCE(sca.total_added, 0) > 0 
          THEN LEAST(30, (COALESCE(sca.total_sold, 0)::numeric / sca.total_added::numeric) * 30)
          ELSE 0
        END) +
        (CASE 
          WHEN EXTRACT(days FROM now() - COALESCE(sca.first_stock_date, ai.created_at)) > 0 
          THEN LEAST(30, (COALESCE(sca.total_sold, 0) / EXTRACT(days FROM now() - COALESCE(sca.first_stock_date, ai.created_at))) * 30 * 10)
          ELSE 0
        END)
      )))::integer
    END as performance_score,
    CASE 
      WHEN COALESCE(sca.total_sold, 0) = 0 THEN 'No Sales'
      WHEN (COALESCE(sca.sales_7d, 0) / 7.0) >= 1 THEN 'Excellent'
      WHEN (COALESCE(sca.sales_30d, 0) / 30.0) >= 0.5 THEN 'Good'
      WHEN (COALESCE(sca.sales_30d, 0) / 30.0) >= 0.1 THEN 'Average'
      ELSE 'Poor'
    END as performance_category,
    CASE 
      WHEN COALESCE(sca.sales_30d, 0) > 0 
      THEN (ai.quantity / (COALESCE(sca.sales_30d, 0) / 30.0))::numeric
      ELSE NULL
    END as stock_days_remaining
  FROM public.asin_inventory ai
  LEFT JOIN stock_changes_agg sca ON sca.inventory_id = ai.id
  LEFT JOIN sellout_times st ON st.inventory_id = ai.id
  WHERE ai.user_id = auth.uid()
    AND (country_filter IS NULL OR ai.country = country_filter)
  ORDER BY 
    CASE 
      WHEN COALESCE(sca.total_sold, 0) = 0 THEN 0
      ELSE 1
    END DESC,
    COALESCE(sca.total_sold, 0) DESC;
END;
$function$;
