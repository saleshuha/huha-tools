-- Drop and recreate the problematic functions with correct structure

DROP FUNCTION IF EXISTS public.get_items_needing_restock();
DROP FUNCTION IF EXISTS public.get_sales_analytics(timestamp with time zone, timestamp with time zone);

-- Recreate get_items_needing_restock function with correct structure
CREATE OR REPLACE FUNCTION public.get_items_needing_restock()
RETURNS TABLE(
  table_name text, 
  item_id uuid, 
  identifier text, 
  current_quantity integer, 
  min_stock_level integer, 
  days_since_last_restock integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'asin_inventory'::text as table_name,
    ai.id as item_id,
    (ai.asin || ' (' || ai.serial_number || ')')::text as identifier,
    ai.quantity as current_quantity,
    ai.min_stock_level as min_stock_level,
    CASE 
      WHEN ai.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - ai.last_restock_date)::integer
    END as days_since_last_restock
  FROM public.asin_inventory ai
  WHERE ai.quantity <= ai.min_stock_level
    AND ai.status = 'in-stock'
  
  UNION ALL
  
  SELECT 
    'sku_inventory'::text as table_name,
    si.id as item_id,
    (si.sku_number || ' (' || si.bin_serial_number || ')')::text as identifier,
    si.quantity as current_quantity,
    si.min_stock_level as min_stock_level,
    CASE 
      WHEN si.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - si.last_restock_date)::integer
    END as days_since_last_restock
  FROM public.sku_inventory si
  WHERE si.quantity <= si.min_stock_level
    AND si.status = 'in-stock'
  
  ORDER BY current_quantity ASC, days_since_last_restock DESC NULLS LAST;
END;
$$;

-- Recreate get_sales_analytics function with correct structure
CREATE OR REPLACE FUNCTION public.get_sales_analytics(
  start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), 
  end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(
  product_type text, 
  total_sold integer, 
  avg_days_to_sell numeric, 
  fastest_selling_item text, 
  slowest_selling_item text, 
  restock_frequency_days numeric, 
  predicted_restock_needed_items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  asin_analytics RECORD;
  sku_analytics RECORD;
BEGIN
  -- ASIN Analytics
  SELECT 
    COUNT(*) as total_sold,
    AVG(EXTRACT(days FROM date_sold - date_added)) as avg_days,
    (SELECT asin FROM asin_inventory WHERE date_sold BETWEEN start_date AND end_date 
     AND date_sold IS NOT NULL
     ORDER BY (date_sold - date_added) ASC LIMIT 1) as fastest,
    (SELECT asin FROM asin_inventory WHERE date_sold BETWEEN start_date AND end_date 
     AND date_sold IS NOT NULL
     ORDER BY (date_sold - date_added) DESC LIMIT 1) as slowest,
    AVG(EXTRACT(days FROM last_restock_date - date_added)) as restock_freq
  INTO asin_analytics
  FROM asin_inventory 
  WHERE date_sold BETWEEN start_date AND end_date
    AND date_sold IS NOT NULL;

  -- SKU Analytics  
  SELECT 
    COUNT(*) as total_sold,
    AVG(EXTRACT(days FROM date_sold - date_added)) as avg_days,
    (SELECT sku_number FROM sku_inventory WHERE date_sold BETWEEN start_date AND end_date 
     AND date_sold IS NOT NULL
     ORDER BY (date_sold - date_added) ASC LIMIT 1) as fastest,
    (SELECT sku_number FROM sku_inventory WHERE date_sold BETWEEN start_date AND end_date 
     AND date_sold IS NOT NULL
     ORDER BY (date_sold - date_added) DESC LIMIT 1) as slowest,
    AVG(EXTRACT(days FROM last_restock_date - date_added)) as restock_freq
  INTO sku_analytics
  FROM sku_inventory 
  WHERE date_sold BETWEEN start_date AND end_date
    AND date_sold IS NOT NULL;

  -- Return ASIN results
  product_type := 'ASIN';
  total_sold := COALESCE(asin_analytics.total_sold, 0);
  avg_days_to_sell := COALESCE(asin_analytics.avg_days, 0);
  fastest_selling_item := COALESCE(asin_analytics.fastest, 'N/A');
  slowest_selling_item := COALESCE(asin_analytics.slowest, 'N/A');
  restock_frequency_days := COALESCE(asin_analytics.restock_freq, 0);
  predicted_restock_needed_items := (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 
      'asin', asin, 
      'predicted_days', GREATEST(1, COALESCE(asin_analytics.avg_days, 7))
    )), '[]'::jsonb)
    FROM asin_inventory 
    WHERE quantity <= min_stock_level + 2 AND status = 'in-stock'
  );
  RETURN NEXT;

  -- Return SKU results
  product_type := 'SKU';
  total_sold := COALESCE(sku_analytics.total_sold, 0);
  avg_days_to_sell := COALESCE(sku_analytics.avg_days, 0);
  fastest_selling_item := COALESCE(sku_analytics.fastest, 'N/A');
  slowest_selling_item := COALESCE(sku_analytics.slowest, 'N/A');
  restock_frequency_days := COALESCE(sku_analytics.restock_freq, 0);
  predicted_restock_needed_items := (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 
      'sku', sku_number, 
      'predicted_days', GREATEST(1, COALESCE(sku_analytics.avg_days, 7))
    )), '[]'::jsonb)
    FROM sku_inventory 
    WHERE quantity <= min_stock_level + 2 AND status = 'in-stock'
  );
  RETURN NEXT;
END;
$$;