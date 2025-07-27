-- Update the get_items_needing_restock function to exclude items with 'ordered' status
CREATE OR REPLACE FUNCTION public.get_items_needing_restock(country_filter text DEFAULT NULL::text)
 RETURNS TABLE(table_name text, item_id uuid, identifier text, current_quantity integer, days_since_last_restock integer, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    END as days_since_last_restock,
    ai.status::text as status
  FROM public.asin_inventory ai
  WHERE ai.quantity = 0  -- Only show items with 0 quantity
    AND ai.status != 'ordered'  -- Exclude items already marked as ordered
    AND ai.user_id = auth.uid()  -- Only show user's own items
    AND (country_filter IS NULL OR ai.country = country_filter)  -- Filter by country if provided
  
  UNION ALL
  
  SELECT 
    'sku_inventory'::text as table_name,
    si.id as item_id,
    (si.sku_number || ' (' || si.bin_serial_number || ')')::text as identifier,
    si.quantity as current_quantity,
    CASE 
      WHEN si.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - si.last_restock_date)::integer
    END as days_since_last_restock,
    si.status::text as status
  FROM public.sku_inventory si
  WHERE si.quantity = 0  -- Only show items with 0 quantity
    AND si.status != 'ordered'  -- Exclude items already marked as ordered
    AND si.user_id = auth.uid()  -- Only show user's own items
    AND (country_filter IS NULL OR si.country = country_filter)  -- Filter by country if provided
  
  ORDER BY current_quantity ASC, days_since_last_restock DESC NULLS LAST;
END;
$function$