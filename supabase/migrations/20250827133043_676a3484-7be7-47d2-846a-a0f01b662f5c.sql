-- Update function to only activate matching items, don't deactivate non-matching ones
CREATE OR REPLACE FUNCTION public.update_print_eligible_items_by_order_skus(user_id_param uuid)
RETURNS TABLE(
  updated_active_count integer,
  updated_inactive_count integer,
  total_unique_skus integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  active_count integer := 0;
  inactive_count integer := 0;
  unique_sku_count integer := 0;
  order_skus text[];
BEGIN
  -- Collect all unique SKUs from various order tables for the user
  SELECT ARRAY_AGG(DISTINCT order_sku) INTO order_skus
  FROM (
    -- From orders table
    SELECT sku as order_sku
    FROM public.orders 
    WHERE user_id = user_id_param 
      AND sku IS NOT NULL 
      AND sku != ''
    
    UNION
    
    -- From order_imports table  
    SELECT sku as order_sku
    FROM public.order_imports
    WHERE user_id = user_id_param
      AND sku IS NOT NULL
      AND sku != ''
    
    UNION
    
    -- From po_orders table (using sku_code)
    SELECT sku_code as order_sku
    FROM public.po_orders
    WHERE user_id = user_id_param
      AND sku_code IS NOT NULL
      AND sku_code != ''
    
    UNION
    
    -- From noon_sales_data table
    SELECT sku as order_sku
    FROM public.noon_sales_data
    WHERE user_id = user_id_param
      AND sku IS NOT NULL
      AND sku != ''
    
    UNION
    
    -- From asin_inventory table (using sku)
    SELECT sku as order_sku
    FROM public.asin_inventory
    WHERE user_id = user_id_param
      AND sku IS NOT NULL
      AND sku != ''
    
    UNION
    
    -- From sku_inventory table (using sku_number)
    SELECT sku_number as order_sku
    FROM public.sku_inventory
    WHERE user_id = user_id_param
      AND sku_number IS NOT NULL
      AND sku_number != ''
  ) all_skus;
  
  -- Handle case where no SKUs are found
  IF order_skus IS NULL THEN
    order_skus := ARRAY[]::text[];
  END IF;
  
  -- Count total unique SKUs
  unique_sku_count := array_length(order_skus, 1);
  IF unique_sku_count IS NULL THEN
    unique_sku_count := 0;
  END IF;
  
  -- Only update print eligible items to active where identifier matches order SKUs
  -- Do NOT deactivate non-matching items
  UPDATE public.print_eligible_items 
  SET is_active = true, updated_at = now()
  WHERE user_id = user_id_param
    AND identifier = ANY(order_skus)
    AND is_active = false;
    
  GET DIAGNOSTICS active_count = ROW_COUNT;
  
  -- Set inactive_count to 0 since we're not deactivating items
  inactive_count := 0;
  
  -- Return results
  RETURN QUERY SELECT active_count, inactive_count, unique_sku_count;
END;
$function$;