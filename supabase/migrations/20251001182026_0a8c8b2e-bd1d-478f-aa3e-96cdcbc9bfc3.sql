-- Fix ambiguous column reference in quarterly velocity analysis
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
  total_added integer,
  total_sold integer,
  first_added_date timestamp with time zone,
  quarterly_data jsonb,
  recommended_quantity integer,
  velocity_score numeric,
  trend_pattern text,
  growth_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  start_date := date_trunc('quarter', now() - make_interval(years => lookback_years));
  
  RETURN QUERY
  WITH quarterly_aggregates AS (
    SELECT 
      ai.id as item_asin_id,
      ai.asin as item_asin,
      ai.sku as item_sku,
      ai.title as item_title,
      ai.serial_number as item_serial_number,
      ai.quantity as item_current_quantity,
      ai.date_added as item_first_added_date,
      date_trunc('quarter', sc.created_at) as quarter,
      SUM(CASE WHEN sc.change_amount > 0 THEN sc.change_amount ELSE 0 END)::integer as added,
      ABS(SUM(CASE WHEN sc.change_amount < 0 THEN sc.change_amount ELSE 0 END))::integer as sold
    FROM public.asin_inventory ai
    LEFT JOIN public.stock_changes sc ON sc.inventory_id = ai.id 
      AND sc.created_at >= start_date
    WHERE ai.user_id = auth.uid()
      AND (country_filter IS NULL OR ai.country = country_filter)
      AND ai.eligible_for_restock = true
    GROUP BY ai.id, ai.asin, ai.sku, ai.title, ai.serial_number, ai.quantity, ai.date_added, date_trunc('quarter', sc.created_at)
  ),
  quarterly_summary AS (
    SELECT 
      qa.item_asin_id,
      qa.item_asin,
      qa.item_sku,
      qa.item_title,
      qa.item_serial_number,
      qa.item_current_quantity,
      qa.item_first_added_date,
      jsonb_object_agg(
        to_char(qa.quarter, 'YYYY-Q"Q"'),
        jsonb_build_object(
          'added', COALESCE(qa.added, 0),
          'sold', COALESCE(qa.sold, 0),
          'net', COALESCE(qa.added, 0) - COALESCE(qa.sold, 0)
        )
      ) FILTER (WHERE qa.quarter IS NOT NULL) as item_quarterly_data,
      SUM(COALESCE(qa.added, 0))::integer as item_total_added,
      SUM(COALESCE(qa.sold, 0))::integer as item_total_sold
    FROM quarterly_aggregates qa
    GROUP BY qa.item_asin_id, qa.item_asin, qa.item_sku, qa.item_title, qa.item_serial_number, qa.item_current_quantity, qa.item_first_added_date
  ),
  pattern_analysis AS (
    SELECT 
      qs.item_asin_id,
      qs.item_asin,
      qs.item_sku,
      qs.item_title,
      qs.item_serial_number,
      qs.item_current_quantity,
      qs.item_first_added_date,
      qs.item_quarterly_data,
      qs.item_total_added,
      qs.item_total_sold,
      CASE 
        WHEN jsonb_array_length(quarters_agg.quarters) >= 3 THEN
          (
            (jsonb_array_length(quarters_agg.quarters) * quarters_agg.sum_xy - quarters_agg.sum_x * quarters_agg.sum_y) /
            NULLIF(jsonb_array_length(quarters_agg.quarters) * quarters_agg.sum_x2 - quarters_agg.sum_x * quarters_agg.sum_x, 0)
          )
        ELSE 0
      END as trend_slope,
      CASE 
        WHEN qs.item_total_sold > 0 AND jsonb_array_length(quarters_agg.quarters) >= 2 THEN
          (COALESCE((quarters_agg.recent_sold::numeric / NULLIF(quarters_agg.avg_sold, 0)) - 1, 0) * 100)
        ELSE 0
      END as item_growth_rate,
      CASE 
        WHEN quarters_agg.avg_sold > 0 THEN (quarters_agg.stddev_sold / NULLIF(quarters_agg.avg_sold, 0))
        ELSE 0
      END as volatility
    FROM quarterly_summary qs
    CROSS JOIN LATERAL (
      SELECT 
        jsonb_agg(q.value) as quarters,
        SUM((q.idx + 1) * (q.value->>'sold')::numeric) as sum_xy,
        SUM(q.idx + 1) as sum_x,
        SUM((q.value->>'sold')::numeric) as sum_y,
        SUM(POWER(q.idx + 1, 2)) as sum_x2,
        AVG((q.value->>'sold')::numeric) as avg_sold,
        STDDEV((q.value->>'sold')::numeric) as stddev_sold,
        (SELECT (q2.value->>'sold')::numeric 
         FROM jsonb_each(qs.item_quarterly_data) q2 
         ORDER BY q2.key DESC 
         LIMIT 1) as recent_sold
      FROM jsonb_each(qs.item_quarterly_data) WITH ORDINALITY q(key, value, idx)
    ) quarters_agg
  ),
  recommendations AS (
    SELECT 
      pa.item_asin_id,
      pa.item_asin,
      pa.item_sku,
      pa.item_title,
      pa.item_serial_number,
      pa.item_current_quantity,
      pa.item_first_added_date,
      pa.item_quarterly_data,
      pa.item_total_added,
      pa.item_total_sold,
      pa.item_growth_rate,
      CASE 
        WHEN pa.trend_slope > 2 AND pa.item_growth_rate > 30 THEN 'Exponential Growth'
        WHEN pa.trend_slope > 0.5 AND pa.item_growth_rate > 10 THEN 'Linear Growth'
        WHEN pa.trend_slope BETWEEN -0.5 AND 0.5 AND pa.item_total_sold > 0 THEN 'Stable/Plateau'
        WHEN pa.trend_slope < -0.5 OR pa.item_growth_rate < -20 THEN 'Declining'
        WHEN pa.item_total_sold < 3 AND pa.trend_slope > 0 THEN 'Slow Starter'
        WHEN pa.volatility > 0.5 THEN 'Volatile'
        ELSE 'Unknown'
      END as pattern_type,
      GREATEST(
        3,
        CEIL(
          (pa.item_total_sold::numeric / NULLIF(EXTRACT(days FROM now() - pa.item_first_added_date), 0)) * 30
        )
      ) as base_recommendation,
      ROUND(
        pa.item_total_sold::numeric / NULLIF(EXTRACT(days FROM now() - pa.item_first_added_date), 0),
        2
      ) as item_velocity_score
    FROM pattern_analysis pa
  )
  SELECT 
    r.item_asin_id,
    r.item_asin,
    r.item_sku,
    r.item_title,
    r.item_serial_number,
    r.item_current_quantity,
    r.item_total_added,
    r.item_total_sold,
    r.item_first_added_date,
    COALESCE(r.item_quarterly_data, '{}'::jsonb),
    GREATEST(
      3,
      CEIL(
        r.base_recommendation *
        CASE r.pattern_type
          WHEN 'Exponential Growth' THEN 2.0
          WHEN 'Linear Growth' THEN 1.5
          WHEN 'Slow Starter' THEN 1.3
          WHEN 'Volatile' THEN 1.4
          WHEN 'Stable/Plateau' THEN 1.0
          WHEN 'Declining' THEN 0.6
          ELSE 1.0
        END *
        (1 + GREATEST(-0.5, LEAST(0.5, r.item_growth_rate / 100)))
      )
    )::integer,
    r.item_velocity_score,
    r.pattern_type,
    ROUND(r.item_growth_rate, 1)
  FROM recommendations r
  WHERE r.item_total_sold > 0
  ORDER BY 
    CASE r.pattern_type
      WHEN 'Exponential Growth' THEN 1
      WHEN 'Linear Growth' THEN 2
      WHEN 'Slow Starter' THEN 3
      WHEN 'Volatile' THEN 4
      WHEN 'Stable/Plateau' THEN 5
      WHEN 'Declining' THEN 6
      ELSE 7
    END,
    r.item_total_sold DESC;
END;
$$;