-- Drop the existing function to recreate with improved logic
DROP FUNCTION IF EXISTS public.get_inventory_velocity_analysis(text, integer);

-- Create improved velocity analysis function with better recommendation logic
CREATE OR REPLACE FUNCTION public.get_inventory_velocity_analysis(
  country_filter text DEFAULT NULL,
  lookback_days integer DEFAULT 90
)
RETURNS TABLE(
  table_name text,
  item_id uuid,
  identifier text,
  current_quantity integer,
  total_sales integer,
  days_since_last_sale integer,
  days_since_last_restock integer,
  average_days_between_sales numeric,
  sales_velocity numeric,
  velocity_category text,
  recommended_reorder_quantity integer,
  reorder_point integer,
  stock_days_remaining numeric,
  urgency_score integer
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
  
  -- Set default if no data
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
      ai.quantity as current_quantity,
      
      -- Count total sales in lookback period
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
      
      -- Calculate average days between sales
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
      
      -- Sales velocity (items per day) - calculated over full item lifetime
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
      ai.sku,
      
      -- Count total stock additions for turnover calculation
      COALESCE((
        SELECT SUM(ABS(sc.change_amount)) FROM public.stock_changes sc 
        WHERE sc.inventory_id = ai.id AND sc.change_amount > 0
      ), 0) as total_added
      
    FROM public.asin_inventory ai
    WHERE ai.eligible_for_restock = true
      AND (country_filter IS NULL OR ai.country = country_filter)
      AND ai.user_id = auth.uid()
  )
  SELECT 
    vd.table_name,
    vd.item_id,
    vd.identifier,
    vd.current_quantity,
    vd.total_sales,
    vd.days_since_last_sale,
    vd.days_since_last_restock,
    vd.average_days_between_sales,
    vd.sales_velocity,
    
    -- Velocity category classification
    CASE 
      WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 'Fast Moving'
      WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 'Medium Moving'
      WHEN vd.sales_velocity > 0 THEN 'Slow Moving'
      ELSE 'No Sales'
    END as velocity_category,
    
    -- IMPROVED RECOMMENDATION LOGIC
    CASE 
      -- No recommendation for items with no sales
      WHEN vd.total_sales = 0 THEN 0
      
      -- Low volume items (1-3 sales) - conservative approach
      WHEN vd.total_sales <= 3 THEN
        CASE 
          WHEN vd.total_sales = 1 THEN 1  -- Just sold 1, recommend 1
          WHEN vd.total_sales = 2 THEN 2  -- Sold 2, recommend 2
          ELSE 3  -- Sold 3, recommend 3
        END
      
      -- Medium volume items (4-10 sales) - scale up gradually
      WHEN vd.total_sales <= 10 THEN
        CASE
          -- Fast movers: 1.5x recent sales, minimum equal to total_sales
          WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 
            GREATEST(vd.total_sales, CEIL(vd.total_sales * 1.5))
          -- Medium movers: match recent sales volume
          WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 
            GREATEST(vd.total_sales, CEIL(vd.total_sales * 1.2))
          -- Slow movers: slightly below recent volume
          ELSE 
            GREATEST(CEIL(vd.total_sales * 0.8), 2)
        END
      
      -- High volume items (11+ sales) - use velocity-based forecasting
      ELSE
        CASE
          -- Fast movers: 3 weeks supply
          WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 
            GREATEST(vd.total_sales / 2, CEIL(vd.sales_velocity * 21))
          -- Medium movers: 2 weeks supply
          WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 
            GREATEST(vd.total_sales / 3, CEIL(vd.sales_velocity * 14))
          -- Slow movers: 1.5 weeks supply
          WHEN vd.sales_velocity > 0 THEN 
            GREATEST(vd.total_sales / 4, CEIL(vd.sales_velocity * 10))
          ELSE vd.total_sales / 4
        END
    END::integer as recommended_reorder_quantity,
    
    -- Reorder point - when current stock hits this, it's time to reorder
    CASE 
      WHEN vd.total_sales = 0 THEN 0
      WHEN vd.total_sales <= 3 THEN 0  -- Reorder immediately when sold out
      WHEN vd.sales_velocity > 0 THEN 
        GREATEST(1, CEIL(vd.sales_velocity * 5))  -- 5 days buffer
      ELSE 1
    END::integer as reorder_point,
    
    -- Stock days remaining
    CASE 
      WHEN vd.sales_velocity > 0 THEN vd.current_quantity / NULLIF(vd.sales_velocity, 0)
      ELSE NULL
    END as stock_days_remaining,
    
    -- Enhanced urgency score (0-100)
    CASE 
      WHEN vd.current_quantity = 0 AND vd.total_sales > 0 THEN 100
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 3 THEN 90
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 7 THEN 70
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 14 THEN 50
      WHEN vd.current_quantity <= 1 AND vd.total_sales > 0 THEN 60
      WHEN vd.current_quantity <= 2 AND vd.total_sales > 0 THEN 40
      WHEN vd.total_sales > 0 THEN 30
      ELSE 10
    END::integer as urgency_score
    
  FROM velocity_data vd
  ORDER BY urgency_score DESC, vd.sales_velocity DESC;
  
END;
$$;