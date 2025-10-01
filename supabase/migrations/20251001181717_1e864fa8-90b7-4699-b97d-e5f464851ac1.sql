-- Enhanced Pattern-Based Recommendation System
-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_quarterly_velocity_analysis(text, integer);

-- Create enhanced function with pattern-based recommendations
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
  -- Calculate start date based on lookback years
  start_date := date_trunc('quarter', now() - make_interval(years => lookback_years));
  
  RETURN QUERY
  WITH quarterly_aggregates AS (
    -- Aggregate stock changes by quarter for each item
    SELECT 
      ai.id as asin_id,
      ai.asin,
      ai.sku,
      ai.title,
      ai.serial_number,
      ai.quantity as current_quantity,
      ai.date_added as first_added_date,
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
    -- Build quarterly data JSON and calculate totals
    SELECT 
      asin_id,
      asin,
      sku,
      title,
      serial_number,
      current_quantity,
      first_added_date,
      jsonb_object_agg(
        to_char(quarter, 'YYYY-Q"Q"'),
        jsonb_build_object(
          'added', COALESCE(added, 0),
          'sold', COALESCE(sold, 0),
          'net', COALESCE(added, 0) - COALESCE(sold, 0)
        )
      ) FILTER (WHERE quarter IS NOT NULL) as quarterly_data,
      SUM(COALESCE(added, 0))::integer as total_added,
      SUM(COALESCE(sold, 0))::integer as total_sold
    FROM quarterly_aggregates
    GROUP BY asin_id, asin, sku, title, serial_number, current_quantity, first_added_date
  ),
  pattern_analysis AS (
    -- Analyze patterns and trends from quarterly data
    SELECT 
      qs.*,
      -- Calculate trend metrics from quarterly_data
      CASE 
        WHEN jsonb_array_length(jsonb_agg_quarters.quarters) >= 3 THEN
          -- Calculate linear regression slope for trend detection
          (
            (jsonb_array_length(jsonb_agg_quarters.quarters) * sum_xy - sum_x * sum_y) /
            NULLIF(jsonb_array_length(jsonb_agg_quarters.quarters) * sum_x2 - sum_x * sum_x, 0)
          )
        ELSE 0
      END as trend_slope,
      -- Calculate growth rate (recent quarter vs average)
      CASE 
        WHEN qs.total_sold > 0 AND jsonb_array_length(jsonb_agg_quarters.quarters) >= 2 THEN
          (
            COALESCE((recent_sold::numeric / NULLIF(avg_sold, 0)) - 1, 0) * 100
          )
        ELSE 0
      END as growth_rate,
      -- Calculate volatility (coefficient of variation)
      CASE 
        WHEN avg_sold > 0 THEN
          (stddev_sold / NULLIF(avg_sold, 0))
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
         FROM jsonb_each(qs.quarterly_data) q2 
         ORDER BY q2.key DESC 
         LIMIT 1) as recent_sold
      FROM jsonb_each(qs.quarterly_data) WITH ORDINALITY q(key, value, idx)
    ) jsonb_agg_quarters
  ),
  recommendations AS (
    -- Calculate enhanced recommendations with pattern-based multipliers
    SELECT 
      pa.*,
      -- Detect pattern type
      CASE 
        WHEN pa.trend_slope > 2 AND pa.growth_rate > 30 THEN 'Exponential Growth'
        WHEN pa.trend_slope > 0.5 AND pa.growth_rate > 10 THEN 'Linear Growth'
        WHEN pa.trend_slope BETWEEN -0.5 AND 0.5 AND pa.total_sold > 0 THEN 'Stable/Plateau'
        WHEN pa.trend_slope < -0.5 OR pa.growth_rate < -20 THEN 'Declining'
        WHEN pa.total_sold < 3 AND pa.trend_slope > 0 THEN 'Slow Starter'
        WHEN pa.volatility > 0.5 THEN 'Volatile'
        ELSE 'Unknown'
      END as pattern_type,
      -- Calculate base recommendation (30-day projection)
      GREATEST(
        3,
        CEIL(
          (pa.total_sold::numeric / NULLIF(EXTRACT(days FROM now() - pa.first_added_date), 0)) * 30
        )
      ) as base_recommendation
    FROM pattern_analysis pa
  )
  SELECT 
    r.asin_id,
    r.asin,
    r.sku,
    r.title,
    r.serial_number,
    r.current_quantity,
    r.total_added,
    r.total_sold,
    r.first_added_date,
    COALESCE(r.quarterly_data, '{}'::jsonb) as quarterly_data,
    -- Apply pattern-based multipliers to base recommendation
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
        -- Additional growth rate multiplier
        (1 + GREATEST(-0.5, LEAST(0.5, r.growth_rate / 100)))
      )
    )::integer as recommended_quantity,
    -- Calculate velocity score (items per day)
    ROUND(
      r.total_sold::numeric / NULLIF(EXTRACT(days FROM now() - r.first_added_date), 0),
      2
    ) as velocity_score,
    r.pattern_type as trend_pattern,
    ROUND(r.growth_rate, 1) as growth_rate
  FROM recommendations r
  WHERE r.total_sold > 0  -- Only include items with sales history
  ORDER BY 
    -- Prioritize by pattern urgency
    CASE r.pattern_type
      WHEN 'Exponential Growth' THEN 1
      WHEN 'Linear Growth' THEN 2
      WHEN 'Slow Starter' THEN 3
      WHEN 'Volatile' THEN 4
      WHEN 'Stable/Plateau' THEN 5
      WHEN 'Declining' THEN 6
      ELSE 7
    END,
    r.total_sold DESC;
END;
$$;