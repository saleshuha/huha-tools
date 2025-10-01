-- Drop and recreate the function with properly structured CTEs
DROP FUNCTION IF EXISTS public.get_quarterly_velocity_analysis(text, integer);

CREATE OR REPLACE FUNCTION public.get_quarterly_velocity_analysis(
  country_filter text DEFAULT NULL,
  lookback_years integer DEFAULT 2
)
RETURNS TABLE (
  asin_id uuid,
  asin text,
  sku text,
  title text,
  serial_number text,
  current_quantity integer,
  total_added bigint,
  total_sold bigint,
  first_added_date timestamp with time zone,
  quarterly_data jsonb,
  recommended_quantity integer,
  velocity_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT 
      date_trunc('quarter', now() - make_interval(years => lookback_years)) as start_date,
      date_trunc('quarter', now()) as end_date
  ),
  inventory_base AS (
    SELECT 
      ai.id as asin_id,
      ai.asin,
      ai.sku,
      ai.title,
      ai.serial_number,
      ai.quantity as current_quantity,
      ai.date_added as first_added_date
    FROM asin_inventory ai
    WHERE ai.eligible_for_restock = true
      AND (country_filter IS NULL OR ai.country = country_filter)
      AND ai.user_id = auth.uid()
  ),
  stock_changes_quarterly AS (
    SELECT 
      sc.inventory_id,
      to_char(date_trunc('quarter', sc.created_at), 'YYYY-"Q"Q') as quarter,
      COALESCE(SUM(CASE WHEN sc.change_amount > 0 THEN sc.change_amount ELSE 0 END), 0) as added,
      COALESCE(SUM(CASE WHEN sc.change_amount < 0 THEN ABS(sc.change_amount) ELSE 0 END), 0) as sold
    FROM stock_changes sc
    INNER JOIN inventory_base ib ON ib.asin_id = sc.inventory_id
    CROSS JOIN date_range dr
    WHERE sc.created_at >= dr.start_date
      AND sc.created_at <= dr.end_date
    GROUP BY sc.inventory_id, quarter
  ),
  quarterly_aggregated AS (
    SELECT 
      scq.inventory_id,
      jsonb_object_agg(
        scq.quarter,
        jsonb_build_object(
          'added', scq.added,
          'sold', scq.sold,
          'net', (scq.added - scq.sold)
        )
      ) as quarterly_data
    FROM stock_changes_quarterly scq
    GROUP BY scq.inventory_id
  ),
  totals_with_dates AS (
    SELECT 
      sc.inventory_id,
      COALESCE(SUM(CASE WHEN sc.change_amount > 0 THEN sc.change_amount ELSE 0 END), 0) as total_added,
      COALESCE(SUM(CASE WHEN sc.change_amount < 0 THEN ABS(sc.change_amount) ELSE 0 END), 0) as total_sold
    FROM stock_changes sc
    INNER JOIN inventory_base ib ON ib.asin_id = sc.inventory_id
    GROUP BY sc.inventory_id
  )
  SELECT 
    ib.asin_id,
    ib.asin,
    ib.sku,
    ib.title,
    ib.serial_number,
    ib.current_quantity,
    COALESCE(t.total_added, 0)::bigint as total_added,
    COALESCE(t.total_sold, 0)::bigint as total_sold,
    ib.first_added_date,
    COALESCE(qa.quarterly_data, '{}'::jsonb) as quarterly_data,
    CASE
      WHEN COALESCE(t.total_sold, 0) > 0 AND EXTRACT(days FROM (now() - ib.first_added_date)) > 0 THEN 
        GREATEST(1, CEIL((t.total_sold / EXTRACT(days FROM (now() - ib.first_added_date))::numeric) * 30))::integer
      ELSE 0
    END as recommended_quantity,
    CASE 
      WHEN EXTRACT(days FROM (now() - ib.first_added_date)) > 0 AND COALESCE(t.total_sold, 0) > 0
      THEN COALESCE(t.total_sold, 0) / EXTRACT(days FROM (now() - ib.first_added_date))::numeric
      ELSE 0
    END as velocity_score
  FROM inventory_base ib
  LEFT JOIN totals_with_dates t ON t.inventory_id = ib.asin_id
  LEFT JOIN quarterly_aggregated qa ON qa.inventory_id = ib.asin_id
  ORDER BY ib.asin;
END;
$$;