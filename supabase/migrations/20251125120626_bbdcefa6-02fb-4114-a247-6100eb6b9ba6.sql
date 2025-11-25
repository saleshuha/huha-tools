-- Drop both versions of the function to resolve ambiguity
DROP FUNCTION IF EXISTS public.get_daily_sold_items_needing_orders(DATE, TEXT);
DROP FUNCTION IF EXISTS public.get_daily_sold_items_needing_orders(TEXT, TEXT);

-- Create the function with TEXT signature only
CREATE OR REPLACE FUNCTION public.get_daily_sold_items_needing_orders(
  target_date TEXT DEFAULT CURRENT_DATE::TEXT,
  country_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  inventory_id UUID,
  asin TEXT,
  sku TEXT,
  title TEXT,
  sold_quantity INTEGER,
  remaining_stock INTEGER,
  order_status TEXT,
  sale_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id as inventory_id,
    ai.asin,
    ai.sku,
    ai.title,
    1 as sold_quantity,
    ai.quantity as remaining_stock,
    'pending'::TEXT as order_status,
    target_date::DATE as sale_date
  FROM public.asin_inventory ai
  WHERE ai.user_id = auth.uid()
    AND (country_filter IS NULL OR ai.country = country_filter)
    AND ai.quantity > 0
    AND ai.eligible_for_restock = true
    AND ai.status = 'sold'
    AND ai.date_sold::DATE = target_date::DATE;
END;
$$;