-- Add quantity and restock features to ASIN inventory
ALTER TABLE public.asin_inventory 
ADD COLUMN quantity integer NOT NULL DEFAULT 1,
ADD COLUMN min_stock_level integer NOT NULL DEFAULT 5,
ADD COLUMN restock_date timestamp with time zone,
ADD COLUMN restock_quantity integer,
ADD COLUMN last_restock_date timestamp with time zone;

-- Add quantity and restock features to SKU inventory  
ALTER TABLE public.sku_inventory 
ADD COLUMN quantity integer NOT NULL DEFAULT 1,
ADD COLUMN min_stock_level integer NOT NULL DEFAULT 5,
ADD COLUMN restock_date timestamp with time zone,
ADD COLUMN restock_quantity integer,
ADD COLUMN last_restock_date timestamp with time zone,
ADD COLUMN date_sold timestamp with time zone;

-- Create function to identify items needing restock
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
    'asin_inventory'::text,
    ai.id,
    ai.asin || ' (' || ai.serial_number || ')',
    ai.quantity,
    ai.min_stock_level,
    CASE 
      WHEN ai.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - ai.last_restock_date)::integer
    END
  FROM public.asin_inventory ai
  WHERE ai.quantity <= ai.min_stock_level
    AND ai.status = 'in-stock'
  
  UNION ALL
  
  SELECT 
    'sku_inventory'::text,
    si.id,
    si.sku_number || ' (' || si.bin_serial_number || ')',
    si.quantity,
    si.min_stock_level,
    CASE 
      WHEN si.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - si.last_restock_date)::integer
    END
  FROM public.sku_inventory si
  WHERE si.quantity <= si.min_stock_level
    AND si.status = 'in-stock'
  
  ORDER BY current_quantity ASC, days_since_last_restock DESC NULLS LAST;
END;
$$;

-- Create function for AI analytics of selling patterns
CREATE OR REPLACE FUNCTION public.get_sales_analytics(
  start_date timestamp with time zone DEFAULT now() - interval '30 days',
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
     ORDER BY (date_sold - date_added) ASC LIMIT 1) as fastest,
    (SELECT asin FROM asin_inventory WHERE date_sold BETWEEN start_date AND end_date 
     ORDER BY (date_sold - date_added) DESC LIMIT 1) as slowest,
    AVG(EXTRACT(days FROM last_restock_date - date_added)) as restock_freq
  INTO asin_analytics
  FROM asin_inventory 
  WHERE date_sold BETWEEN start_date AND end_date;

  -- SKU Analytics  
  SELECT 
    COUNT(*) as total_sold,
    AVG(EXTRACT(days FROM date_sold - date_added)) as avg_days,
    (SELECT sku_number FROM sku_inventory WHERE date_sold BETWEEN start_date AND end_date 
     ORDER BY (date_sold - date_added) ASC LIMIT 1) as fastest,
    (SELECT sku_number FROM sku_inventory WHERE date_sold BETWEEN start_date AND end_date 
     ORDER BY (date_sold - date_added) DESC LIMIT 1) as slowest,
    AVG(EXTRACT(days FROM last_restock_date - date_added)) as restock_freq
  INTO sku_analytics
  FROM sku_inventory 
  WHERE date_sold BETWEEN start_date AND end_date;

  -- Return ASIN results
  RETURN QUERY SELECT 
    'ASIN'::text,
    COALESCE(asin_analytics.total_sold, 0),
    COALESCE(asin_analytics.avg_days, 0),
    COALESCE(asin_analytics.fastest, 'N/A'),
    COALESCE(asin_analytics.slowest, 'N/A'),
    COALESCE(asin_analytics.restock_freq, 0),
    (SELECT jsonb_agg(jsonb_build_object(
      'id', id, 
      'asin', asin, 
      'predicted_days', GREATEST(1, COALESCE(asin_analytics.avg_days, 7))
    ))
     FROM asin_inventory 
     WHERE quantity <= min_stock_level + 2 AND status = 'in-stock')::jsonb;

  -- Return SKU results
  RETURN QUERY SELECT 
    'SKU'::text,
    COALESCE(sku_analytics.total_sold, 0),
    COALESCE(sku_analytics.avg_days, 0),
    COALESCE(sku_analytics.fastest, 'N/A'),
    COALESCE(sku_analytics.slowest, 'N/A'),
    COALESCE(sku_analytics.restock_freq, 0),
    (SELECT jsonb_agg(jsonb_build_object(
      'id', id, 
      'sku', sku_number, 
      'predicted_days', GREATEST(1, COALESCE(sku_analytics.avg_days, 7))
    ))
     FROM sku_inventory 
     WHERE quantity <= min_stock_level + 2 AND status = 'in-stock')::jsonb;
END;
$$;