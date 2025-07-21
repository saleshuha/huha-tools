-- Remove min_stock_level columns from both inventory tables
ALTER TABLE public.asin_inventory DROP COLUMN IF EXISTS min_stock_level;
ALTER TABLE public.sku_inventory DROP COLUMN IF EXISTS min_stock_level;

-- Create stock_changes table to track all quantity changes
CREATE TABLE public.stock_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inventory_type TEXT NOT NULL CHECK (inventory_type IN ('asin', 'sku')),
  inventory_id UUID NOT NULL,
  asin TEXT,
  sku_number TEXT,
  serial_number TEXT,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stock_changes
ALTER TABLE public.stock_changes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stock_changes
CREATE POLICY "Users can view their own stock changes" 
ON public.stock_changes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stock changes" 
ON public.stock_changes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update the get_items_needing_restock function to remove min_stock_level references
DROP FUNCTION IF EXISTS public.get_items_needing_restock();

CREATE OR REPLACE FUNCTION public.get_items_needing_restock()
RETURNS TABLE(
  table_name text, 
  item_id uuid, 
  identifier text, 
  current_quantity integer, 
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
    CASE 
      WHEN ai.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - ai.last_restock_date)::integer
    END as days_since_last_restock
  FROM public.asin_inventory ai
  WHERE ai.quantity <= 5  -- Default threshold of 5
    AND ai.status = 'in-stock'
  
  UNION ALL
  
  SELECT 
    'sku_inventory'::text as table_name,
    si.id as item_id,
    (si.sku_number || ' (' || si.bin_serial_number || ')')::text as identifier,
    si.quantity as current_quantity,
    CASE 
      WHEN si.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - si.last_restock_date)::integer
    END as days_since_last_restock
  FROM public.sku_inventory si
  WHERE si.quantity <= 5  -- Default threshold of 5
    AND si.status = 'in-stock'
  
  ORDER BY current_quantity ASC, days_since_last_restock DESC NULLS LAST;
END;
$$;

-- Update get_sales_analytics function to remove min_stock_level references
DROP FUNCTION IF EXISTS public.get_sales_analytics(timestamp with time zone, timestamp with time zone);

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
    WHERE quantity <= 5 AND status = 'in-stock'  -- Default threshold of 5
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
    WHERE quantity <= 5 AND status = 'in-stock'  -- Default threshold of 5
  );
  RETURN NEXT;
END;
$$;