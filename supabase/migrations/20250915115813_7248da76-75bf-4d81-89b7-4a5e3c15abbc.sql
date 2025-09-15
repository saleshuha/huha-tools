-- Enhanced inventory velocity analysis function
CREATE OR REPLACE FUNCTION public.get_inventory_velocity_analysis(
  country_filter text DEFAULT NULL::text,
  lookback_days integer DEFAULT 90
) RETURNS TABLE(
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  overall_avg_velocity numeric;
BEGIN
  -- Calculate overall average velocity for comparison
  SELECT AVG(
    CASE 
      WHEN EXTRACT(days FROM now() - ai.date_added) > 0 
      THEN COALESCE((
        SELECT COUNT(*) FROM public.stock_changes sc 
        WHERE sc.item_id = ai.id AND sc.change_amount < 0 
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
      (ai.asin || ' (' || COALESCE(ai.serial_number, 'N/A') || ')')::text as identifier,
      ai.quantity as current_quantity,
      
      -- Count total sales in lookback period
      COALESCE((
        SELECT COUNT(*) FROM public.stock_changes sc 
        WHERE sc.item_id = ai.id 
        AND sc.change_amount < 0 
        AND sc.created_at >= (now() - make_interval(days => lookback_days))
      ), 0)::integer as total_sales,
      
      -- Days since last sale
      COALESCE(
        EXTRACT(days FROM now() - (
          SELECT MAX(sc.created_at) FROM public.stock_changes sc 
          WHERE sc.item_id = ai.id AND sc.change_amount < 0
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
          WHERE sc.item_id = ai.id AND sc.change_amount < 0
        ), 0) > 1 THEN
          EXTRACT(days FROM now() - ai.date_added) / NULLIF((
            SELECT COUNT(*) FROM public.stock_changes sc 
            WHERE sc.item_id = ai.id AND sc.change_amount < 0
          ), 0)
        ELSE 
          EXTRACT(days FROM now() - ai.date_added)
      END as average_days_between_sales,
      
      -- Sales velocity (items per day)
      CASE 
        WHEN EXTRACT(days FROM now() - ai.date_added) > 0 
        THEN COALESCE((
          SELECT COUNT(*) FROM public.stock_changes sc 
          WHERE sc.item_id = ai.id AND sc.change_amount < 0 
          AND sc.created_at >= (now() - make_interval(days => lookback_days))
        ), 0) / EXTRACT(days FROM now() - ai.date_added)::numeric
        ELSE 0 
      END as sales_velocity,
      
      ai.date_added,
      ai.eligible_for_restock
      
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
    
    -- Recommended reorder quantity based on velocity
    CASE 
      WHEN vd.sales_velocity >= overall_avg_velocity * 2 THEN 
        GREATEST(1, CEIL(vd.sales_velocity * 21))  -- 3 weeks for fast movers
      WHEN vd.sales_velocity >= overall_avg_velocity * 0.75 THEN 
        GREATEST(1, CEIL(vd.sales_velocity * 14))  -- 2 weeks for medium movers
      WHEN vd.sales_velocity > 0 THEN 
        GREATEST(1, CEIL(vd.sales_velocity * 10))  -- 1.5 weeks for slow movers
      ELSE 1  -- Minimum order for no-sales items
    END::integer as recommended_reorder_quantity,
    
    -- Reorder point (when to reorder)
    GREATEST(1, CEIL(vd.sales_velocity * 7))::integer as reorder_point,  -- 1 week buffer
    
    -- Stock days remaining
    CASE 
      WHEN vd.sales_velocity > 0 THEN vd.current_quantity / NULLIF(vd.sales_velocity, 0)
      ELSE NULL
    END as stock_days_remaining,
    
    -- Urgency score (0-100)
    CASE 
      WHEN vd.current_quantity = 0 THEN 100
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 3 THEN 90
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 7 THEN 70
      WHEN vd.sales_velocity > 0 AND (vd.current_quantity / vd.sales_velocity) <= 14 THEN 50
      WHEN vd.current_quantity <= 1 THEN 60
      ELSE 30
    END::integer as urgency_score
    
  FROM velocity_data vd
  ORDER BY urgency_score DESC, vd.sales_velocity DESC;
  
END;
$$;