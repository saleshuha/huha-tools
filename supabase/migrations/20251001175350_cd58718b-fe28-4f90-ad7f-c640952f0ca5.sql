-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_quarterly_velocity_analysis(text, integer);

-- Create improved function with correct calculations and status filtering
CREATE OR REPLACE FUNCTION public.get_quarterly_velocity_analysis(
  country_filter text DEFAULT NULL,
  lookback_years integer DEFAULT 2
)
RETURNS TABLE(
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
  velocity_score numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lookback_date timestamp with time zone;
BEGIN
  lookback_date := now() - make_interval(years => lookback_years);
  
  RETURN QUERY
  WITH inventory_items AS (
    -- Get only global status items (exclude local)
    SELECT 
      ai.id,
      ai.asin,
      ai.sku,
      ai.title,
      ai.serial_number,
      ai.quantity,
      ai.date_added,
      ai.status,
      ai.user_id
    FROM public.asin_inventory ai
    WHERE ai.user_id = auth.uid()
      AND (country_filter IS NULL OR ai.country = country_filter)
      AND ai.status != 'local'  -- Exclude local items
      AND ai.eligible_for_restock = true
  ),
  stock_movements AS (
    -- Get all stock changes for each inventory item
    SELECT 
      ii.id as inventory_id,
      ii.asin,
      ii.sku,
      ii.title,
      ii.serial_number,
      ii.quantity as current_quantity,
      ii.date_added,
      ii.status,
      sc.change_amount,
      sc.change_reason,
      sc.created_at as change_date,
      DATE_TRUNC('quarter', sc.created_at) as quarter
    FROM inventory_items ii
    LEFT JOIN public.stock_changes sc ON sc.inventory_id = ii.id
    WHERE sc.created_at >= lookback_date OR sc.created_at IS NULL
  ),
  quarterly_aggregates AS (
    -- Aggregate by quarter for each inventory item
    SELECT 
      inventory_id,
      quarter,
      SUM(CASE WHEN change_amount > 0 THEN change_amount ELSE 0 END) as added,
      ABS(SUM(CASE WHEN change_amount < 0 THEN change_amount ELSE 0 END)) as sold,
      SUM(change_amount) as net
    FROM stock_movements
    WHERE quarter IS NOT NULL
    GROUP BY inventory_id, quarter
  ),
  item_analytics AS (
    -- Calculate totals and velocity for each item
    SELECT 
      sm.inventory_id,
      sm.asin,
      sm.sku,
      sm.title,
      sm.serial_number,
      sm.current_quantity,
      sm.status,
      MIN(sm.date_added) as first_added_date,
      
      -- Total added (positive changes)
      COALESCE(SUM(CASE WHEN sm.change_amount > 0 THEN sm.change_amount ELSE 0 END), 0)::bigint as total_added,
      
      -- Total sold (negative changes)
      COALESCE(ABS(SUM(CASE WHEN sm.change_amount < 0 THEN sm.change_amount ELSE 0 END)), 0)::bigint as total_sold,
      
      -- Calculate quarterly data
      jsonb_object_agg(
        COALESCE(qa.quarter::text, 'unknown'),
        jsonb_build_object(
          'added', COALESCE(qa.added, 0),
          'sold', COALESCE(qa.sold, 0),
          'net', COALESCE(qa.net, 0)
        )
      ) FILTER (WHERE qa.quarter IS NOT NULL) as quarterly_data,
      
      -- Calculate velocity score (sales per month)
      CASE 
        WHEN EXTRACT(days FROM now() - MIN(sm.date_added)) > 0 THEN
          (ABS(SUM(CASE WHEN sm.change_amount < 0 THEN sm.change_amount ELSE 0 END)) / 
           NULLIF(EXTRACT(days FROM now() - MIN(sm.date_added)), 0)) * 30
        ELSE 0
      END as velocity_score
      
    FROM stock_movements sm
    LEFT JOIN quarterly_aggregates qa ON qa.inventory_id = sm.inventory_id
    GROUP BY sm.inventory_id, sm.asin, sm.sku, sm.title, sm.serial_number, sm.current_quantity, sm.status
  ),
  restock_analysis AS (
    -- Analyze restock patterns for smarter recommendations
    SELECT 
      sm.inventory_id,
      -- Get restock events (positive changes)
      jsonb_agg(
        jsonb_build_object(
          'date', sm.change_date,
          'amount', sm.change_amount
        ) ORDER BY sm.change_date
      ) FILTER (WHERE sm.change_amount > 0) as restock_events,
      
      -- Calculate average time between restocks
      CASE 
        WHEN COUNT(*) FILTER (WHERE sm.change_amount > 0) > 1 THEN
          EXTRACT(days FROM 
            (MAX(sm.change_date) FILTER (WHERE sm.change_amount > 0) - 
             MIN(sm.change_date) FILTER (WHERE sm.change_amount > 0))
          ) / NULLIF(COUNT(*) FILTER (WHERE sm.change_amount > 0) - 1, 0)
        ELSE NULL
      END as avg_days_between_restocks,
      
      -- Average restock quantity
      AVG(sm.change_amount) FILTER (WHERE sm.change_amount > 0) as avg_restock_qty,
      
      -- Sales velocity (items per day)
      CASE 
        WHEN EXTRACT(days FROM now() - MIN(sm.change_date)) > 0 THEN
          ABS(SUM(CASE WHEN sm.change_amount < 0 THEN sm.change_amount ELSE 0 END)) / 
          NULLIF(EXTRACT(days FROM now() - MIN(sm.change_date)), 0)
        ELSE 0
      END as daily_sales_velocity
      
    FROM stock_movements sm
    GROUP BY sm.inventory_id
  )
  SELECT 
    ia.inventory_id as asin_id,
    ia.asin,
    ia.sku,
    ia.title,
    ia.serial_number,
    ia.current_quantity::integer,
    ia.total_added,
    ia.total_sold,
    ia.first_added_date,
    COALESCE(ia.quarterly_data, '{}'::jsonb) as quarterly_data,
    
    -- Smart recommended quantity based on patterns
    CASE
      -- If we have restock history and sales velocity
      WHEN ra.avg_restock_qty IS NOT NULL AND ra.daily_sales_velocity > 0 THEN
        GREATEST(
          CEIL(ra.avg_restock_qty)::integer,
          CEIL(ra.daily_sales_velocity * COALESCE(ra.avg_days_between_restocks, 30))::integer
        )
      
      -- If we only have sales velocity
      WHEN ra.daily_sales_velocity > 0 THEN
        GREATEST(
          CEIL(ra.daily_sales_velocity * 30)::integer,  -- 30 days supply
          5  -- Minimum order
        )
      
      -- If we have total sold but limited data
      WHEN ia.total_sold > 0 THEN
        GREATEST(
          CEIL(ia.total_sold / GREATEST(EXTRACT(days FROM now() - ia.first_added_date) / 30, 1))::integer,
          3
        )
      
      -- Default for items with no sales history
      ELSE 0
    END::integer as recommended_quantity,
    
    ia.velocity_score,
    ia.status
    
  FROM item_analytics ia
  LEFT JOIN restock_analysis ra ON ra.inventory_id = ia.inventory_id
  WHERE ia.sku IS NOT NULL AND ia.sku != ''  -- Only items with SKU
  ORDER BY ia.velocity_score DESC, ia.total_sold DESC;
END;
$$;