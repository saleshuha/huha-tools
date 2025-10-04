-- Create unified velocity analysis function with safety stock and trend analysis
DROP FUNCTION IF EXISTS public.get_unified_velocity_analysis(text, integer);

CREATE OR REPLACE FUNCTION public.get_unified_velocity_analysis(
  country_filter text DEFAULT NULL,
  lookback_days integer DEFAULT 90
)
RETURNS TABLE(
  table_name text,
  item_id uuid,
  identifier text,
  asin text,
  sku text,
  title text,
  current_quantity integer,
  total_sales integer,
  days_since_last_sale integer,
  days_since_last_restock integer,
  average_days_between_sales numeric,
  sales_velocity numeric,
  velocity_30d numeric,
  velocity_60d numeric,
  velocity_90d numeric,
  velocity_category text,
  velocity_trend text,
  recommended_reorder_quantity integer,
  safety_stock integer,
  reorder_point integer,
  stock_days_remaining numeric,
  days_until_stockout integer,
  urgency_score integer,
  recommendation_confidence integer,
  quarterly_q1_sold integer,
  quarterly_q1_added integer,
  quarterly_q2_sold integer,
  quarterly_q2_added integer,
  quarterly_q3_sold integer,
  quarterly_q3_added integer,
  quarterly_q4_sold integer,
  quarterly_q4_added integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  overall_avg_velocity numeric;
BEGIN
  -- Calculate overall average velocity for comparison
  SELECT AVG(
    CASE 
      WHEN EXTRACT(days FROM now() - ai.date_added) > 0 
      THEN COALESCE((
        SELECT COUNT(*) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount < 0 
        AND sc.created_at >= (now() - interval '90 days')
      ), 0) / EXTRACT(days FROM now() - ai.date_added)::numeric
      ELSE 0 
    END
  ) INTO overall_avg_velocity
  FROM public.asin_inventory ai 
  WHERE ai.eligible_for_restock = true
    AND (country_filter IS NULL OR ai.country = country_filter);
  
  IF overall_avg_velocity IS NULL OR overall_avg_velocity = 0 THEN
    overall_avg_velocity := 0.1;
  END IF;

  RETURN QUERY
  WITH velocity_data AS (
    SELECT 
      'asin_inventory'::text as table_name,
      ai.id as item_id,
      CASE 
        WHEN ai.sku IS NOT NULL AND ai.sku != '' THEN
          (ai.asin || ' (' || COALESCE(ai.serial_number, 'N/A') || ') SKU: ' || ai.sku)::text
        ELSE
          (ai.asin || ' (' || COALESCE(ai.serial_number, 'N/A') || ') - No SKU')::text
      END as identifier,
      ai.asin,
      ai.sku,
      ai.title,
      ai.quantity as current_quantity,
      
      -- Total sales in lookback period
      COALESCE((
        SELECT COUNT(*) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id 
        AND sc.change_amount < 0 
        AND sc.created_at >= (now() - make_interval(days => lookback_days))
      ), 0)::integer as total_sales,
      
      -- Days since last sale
      COALESCE(
        EXTRACT(days FROM now() - (
          SELECT MAX(sc.created_at) FROM public.stock_changes sc 
          WHERE sc.inventory_id = ai.id AND sc.change_amount < 0
        ))::integer,
        EXTRACT(days FROM now() - ai.date_added)::integer
      ) as days_since_last_sale,
      
      -- Days since last restock
      COALESCE(
        EXTRACT(days FROM now() - ai.last_restock_date)::integer,
        EXTRACT(days FROM now() - ai.date_added)::integer
      ) as days_since_last_restock,
      
      -- Average days between sales
      CASE 
        WHEN COALESCE((
          SELECT COUNT(*) FROM public.stock_changes sc 
          WHERE sc.inventory_id = ai.id AND sc.change_amount < 0
        ), 0) > 1 THEN
          EXTRACT(days FROM now() - ai.date_added) / NULLIF((
            SELECT COUNT(*) FROM public.stock_changes sc 
            WHERE sc.inventory_id = ai.id AND sc.change_amount < 0
          ), 0)
        ELSE 
          EXTRACT(days FROM now() - ai.date_added)
      END as average_days_between_sales,
      
      -- 30-day velocity
      CASE 
        WHEN EXTRACT(days FROM now() - ai.date_added) >= 30 
        THEN COALESCE((
          SELECT COUNT(*) FROM public.stock_changes sc 
          WHERE sc.inventory_id = ai.id AND sc.change_amount < 0 
          AND sc.created_at >= (now() - interval '30 days')
        ), 0) / 30.0
        ELSE 0 
      END as velocity_30d,
      
      -- 60-day velocity
      CASE 
        WHEN EXTRACT(days FROM now() - ai.date_added) >= 60 
        THEN COALESCE((
          SELECT COUNT(*) FROM public.stock_changes sc 
          WHERE sc.inventory_id = ai.id AND sc.change_amount < 0 
          AND sc.created_at >= (now() - interval '60 days')
        ), 0) / 60.0
        ELSE 0 
      END as velocity_60d,
      
      -- 90-day velocity
      CASE 
        WHEN EXTRACT(days FROM now() - ai.date_added) > 0 
        THEN COALESCE((
          SELECT COUNT(*) FROM public.stock_changes sc 
          WHERE sc.inventory_id = ai.id AND sc.change_amount < 0 
          AND sc.created_at >= (now() - make_interval(days => lookback_days))
        ), 0) / GREATEST(EXTRACT(days FROM now() - ai.date_added)::numeric, lookback_days)
        ELSE 0 
      END as sales_velocity,
      
      ai.date_added,
      ai.eligible_for_restock,
      
      -- Quarterly data
      COALESCE((
        SELECT COUNT(*) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount < 0
        AND sc.created_at >= date_trunc('year', now()) 
        AND sc.created_at < date_trunc('year', now()) + interval '3 months'
      ), 0)::integer as q1_sold,
      
      COALESCE((
        SELECT SUM(sc.change_amount) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount > 0
        AND sc.created_at >= date_trunc('year', now()) 
        AND sc.created_at < date_trunc('year', now()) + interval '3 months'
      ), 0)::integer as q1_added,
      
      COALESCE((
        SELECT COUNT(*) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount < 0
        AND sc.created_at >= date_trunc('year', now()) + interval '3 months'
        AND sc.created_at < date_trunc('year', now()) + interval '6 months'
      ), 0)::integer as q2_sold,
      
      COALESCE((
        SELECT SUM(sc.change_amount) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount > 0
        AND sc.created_at >= date_trunc('year', now()) + interval '3 months'
        AND sc.created_at < date_trunc('year', now()) + interval '6 months'
      ), 0)::integer as q2_added,
      
      COALESCE((
        SELECT COUNT(*) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount < 0
        AND sc.created_at >= date_trunc('year', now()) + interval '6 months'
        AND sc.created_at < date_trunc('year', now()) + interval '9 months'
      ), 0)::integer as q3_sold,
      
      COALESCE((
        SELECT SUM(sc.change_amount) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount > 0
        AND sc.created_at >= date_trunc('year', now()) + interval '6 months'
        AND sc.created_at < date_trunc('year', now()) + interval '9 months'
      ), 0)::integer as q3_added,
      
      COALESCE((
        SELECT COUNT(*) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount < 0
        AND sc.created_at >= date_trunc('year', now()) + interval '9 months'
      ), 0)::integer as q4_sold,
      
      COALESCE((
        SELECT SUM(sc.change_amount) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount > 0
        AND sc.created_at >= date_trunc('year', now()) + interval '9 months'
      ), 0)::integer as q4_added
      
    FROM public.asin_inventory ai
    WHERE ai.eligible_for_restock = true
      AND (country_filter IS NULL OR ai.country = country_filter)
      AND ai.user_id = auth.uid()
  )
  SELECT 
    vd.table_name,
    vd.item_id,
    vd.identifier,
    vd.asin,
    vd.sku,
    vd.title,
    vd.current_quantity,
    vd.total_sales,
    vd.days_since_last_sale,
    vd.days_since_last_restock,
    vd.average_days_between_sales,
    vd.sales_velocity,
    vd.velocity_30d,
    vd.velocity_60d,
    vd.velocity_90d,
    
    -- Velocity category
    CASE 
      WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 'Fast Moving'
      WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 'Medium Moving'
      WHEN vd.sales_velocity > 0 THEN 'Slow Moving'
      ELSE 'No Sales'
    END as velocity_category,
    
    -- Velocity trend (comparing 30d vs 60d vs 90d)
    CASE
      WHEN vd.velocity_30d > vd.velocity_60d * 1.2 THEN 'trending_up'
      WHEN vd.velocity_30d < vd.velocity_60d * 0.8 THEN 'trending_down'
      ELSE 'stable'
    END as velocity_trend,
    
    -- Calculate safety stock (7-day lead time assumption)
    CASE
      WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 
        CEIL(vd.sales_velocity * 7 * 1.5)::integer -- Fast movers: 1.5x safety factor
      WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 
        CEIL(vd.sales_velocity * 7 * 1.2)::integer -- Medium movers: 1.2x safety factor
      WHEN vd.sales_velocity > 0 THEN 
        CEIL(vd.sales_velocity * 7 * 1.0)::integer -- Slow movers: 1.0x safety factor
      ELSE 0
    END as safety_stock,
    
    -- SMART RECOMMENDATION LOGIC with trend adjustment
    (CASE 
      -- Tier 1: No sales
      WHEN vd.total_sales = 0 THEN 0
      
      -- Tier 2: Very low volume (1-2 sales) - Conservative
      WHEN vd.total_sales <= 2 THEN vd.total_sales
      
      -- Tier 3: Low volume (3-5 sales) - Conservative with growth
      WHEN vd.total_sales <= 5 THEN
        CASE
          WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 
            CEIL(vd.total_sales * 1.3)
          WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 
            vd.total_sales
          ELSE 
            GREATEST(CEIL(vd.total_sales * 0.9), 1)
        END
      
      -- Tier 4: Medium volume (6-15 sales) - Growth pattern with safety stock
      WHEN vd.total_sales <= 15 THEN
        CASE
          WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 
            CEIL(vd.total_sales * 1.5) + CEIL(vd.sales_velocity * 7 * 1.5)
          WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 
            CEIL(vd.total_sales * 1.2) + CEIL(vd.sales_velocity * 7 * 1.2)
          ELSE 
            vd.total_sales + FLOOR(CEIL(vd.sales_velocity * 7 * 1.0) * 0.5)
        END
      
      -- Tier 5: High volume (16+ sales) - Velocity-based with full safety stock
      ELSE
        CASE
          WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 
            CEIL(vd.sales_velocity * 28) + CEIL(vd.sales_velocity * 7 * 1.5)
          WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 
            CEIL(vd.sales_velocity * 21) + CEIL(vd.sales_velocity * 7 * 1.2)
          WHEN vd.sales_velocity > 0 THEN 
            CEIL(vd.sales_velocity * 14) + CEIL(vd.sales_velocity * 7 * 1.0)
          ELSE CEIL(vd.total_sales / 4)
        END
    END *
    -- Apply trend adjustment
    CASE
      WHEN vd.velocity_30d > vd.velocity_60d * 1.2 THEN 1.2 -- Trending up: +20%
      WHEN vd.velocity_30d < vd.velocity_60d * 0.8 THEN 0.85 -- Trending down: -15%
      ELSE 1.0 -- Stable
    END)::integer as recommended_reorder_quantity,
    
    -- Reorder point
    CASE 
      WHEN vd.total_sales = 0 THEN 0
      WHEN vd.total_sales <= 3 THEN 0
      WHEN vd.sales_velocity > 0 THEN 
        GREATEST(1, CEIL(vd.sales_velocity * 7))::integer -- 7 days of sales
      ELSE 1
    END as reorder_point,
    
    -- Stock days remaining
    CASE 
      WHEN vd.sales_velocity > 0 THEN 
        (vd.current_quantity / NULLIF(vd.sales_velocity, 0))::numeric
      ELSE NULL
    END as stock_days_remaining,
    
    -- Days until stockout
    CASE 
      WHEN vd.sales_velocity > 0 AND vd.current_quantity > 0 THEN 
        CEIL(vd.current_quantity / vd.sales_velocity)::integer
      WHEN vd.current_quantity = 0 THEN 0
      ELSE NULL
    END as days_until_stockout,
    
    -- Enhanced urgency score
    CASE 
      WHEN vd.current_quantity = 0 AND vd.total_sales > 0 THEN 100
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 3 THEN 95
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 7 THEN 80
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 14 THEN 60
      WHEN vd.current_quantity <= 1 AND vd.total_sales > 0 THEN 70
      WHEN vd.current_quantity <= 2 AND vd.total_sales > 0 THEN 50
      WHEN vd.total_sales > 0 THEN 30
      ELSE 10
    END::integer as urgency_score,
    
    -- Recommendation confidence (0-100)
    CASE
      WHEN vd.total_sales >= 20 AND vd.velocity_30d > 0 AND vd.velocity_60d > 0 THEN 95
      WHEN vd.total_sales >= 10 AND vd.velocity_30d > 0 THEN 85
      WHEN vd.total_sales >= 5 THEN 70
      WHEN vd.total_sales >= 3 THEN 60
      WHEN vd.total_sales > 0 THEN 40
      ELSE 20
    END::integer as recommendation_confidence,
    
    vd.q1_sold,
    vd.q1_added,
    vd.q2_sold,
    vd.q2_added,
    vd.q3_sold,
    vd.q3_added,
    vd.q4_sold,
    vd.q4_added
    
  FROM velocity_data vd
  ORDER BY urgency_score DESC, vd.sales_velocity DESC;
  
END;
$$;

-- Create velocity_settings table for user preferences
CREATE TABLE IF NOT EXISTS public.velocity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country text NOT NULL DEFAULT 'UAE',
  lead_time_days integer NOT NULL DEFAULT 7,
  service_level_factor numeric NOT NULL DEFAULT 1.2,
  min_order_quantity integer NOT NULL DEFAULT 1,
  max_order_quantity integer NOT NULL DEFAULT 1000,
  trend_sensitivity numeric NOT NULL DEFAULT 0.15,
  safety_stock_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, country)
);

ALTER TABLE public.velocity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own velocity settings"
  ON public.velocity_settings
  FOR ALL
  USING (auth.uid() = user_id);

-- Create velocity_history table for audit trail
CREATE TABLE IF NOT EXISTS public.velocity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL DEFAULT 'asin_inventory',
  system_recommendation integer NOT NULL,
  manual_override integer,
  override_reason text,
  actual_ordered integer,
  confidence_score integer,
  velocity_at_time numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.velocity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own velocity history"
  ON public.velocity_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own velocity history"
  ON public.velocity_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_velocity_history_user_item ON public.velocity_history(user_id, item_id);
CREATE INDEX IF NOT EXISTS idx_velocity_history_created_at ON public.velocity_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_velocity_settings_user_country ON public.velocity_settings(user_id, country);