-- Function to match order SKUs with print eligible items and update their active status
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
BEGIN
  -- Get all unique SKUs from various order tables for the user
  WITH all_order_skus AS (
    -- From orders table
    SELECT DISTINCT sku as order_sku
    FROM public.orders 
    WHERE user_id = user_id_param 
      AND sku IS NOT NULL 
      AND sku != ''
    
    UNION
    
    -- From order_imports table  
    SELECT DISTINCT sku as order_sku
    FROM public.order_imports
    WHERE user_id = user_id_param
      AND sku IS NOT NULL
      AND sku != ''
    
    UNION
    
    -- From po_orders table (using sku_code)
    SELECT DISTINCT sku_code as order_sku
    FROM public.po_orders
    WHERE user_id = user_id_param
      AND sku_code IS NOT NULL
      AND sku_code != ''
    
    UNION
    
    -- From noon_sales_data table
    SELECT DISTINCT sku as order_sku
    FROM public.noon_sales_data
    WHERE user_id = user_id_param
      AND sku IS NOT NULL
      AND sku != ''
    
    UNION
    
    -- From asin_inventory table (using sku)
    SELECT DISTINCT sku as order_sku
    FROM public.asin_inventory
    WHERE user_id = user_id_param
      AND sku IS NOT NULL
      AND sku != ''
    
    UNION
    
    -- From sku_inventory table (using sku_number)
    SELECT DISTINCT sku_number as order_sku
    FROM public.sku_inventory
    WHERE user_id = user_id_param
      AND sku_number IS NOT NULL
      AND sku_number != ''
  )
  
  -- Count total unique SKUs
  SELECT COUNT(*) INTO unique_sku_count FROM all_order_skus;
  
  -- Update print eligible items to active where identifier matches order SKUs
  UPDATE public.print_eligible_items 
  SET is_active = true, updated_at = now()
  WHERE user_id = user_id_param
    AND identifier IN (SELECT order_sku FROM all_order_skus)
    AND is_active = false;
    
  GET DIAGNOSTICS active_count = ROW_COUNT;
  
  -- Update print eligible items to inactive where identifier doesn't match order SKUs
  UPDATE public.print_eligible_items 
  SET is_active = false, updated_at = now()
  WHERE user_id = user_id_param
    AND identifier NOT IN (SELECT order_sku FROM all_order_skus)
    AND is_active = true;
    
  GET DIAGNOSTICS inactive_count = ROW_COUNT;
  
  -- Return results
  RETURN QUERY SELECT active_count, inactive_count, unique_sku_count;
END;
$function$;