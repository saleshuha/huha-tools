-- Function to update ASIN inventory item status by ASIN
CREATE OR REPLACE FUNCTION public.update_asin_inventory_status_by_asin(
  target_asin text,
  new_status inventory_status,
  target_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  updated_count integer,
  item_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  update_count integer := 0;
  item_info jsonb;
BEGIN
  -- Update the item status
  UPDATE public.asin_inventory 
  SET 
    status = new_status,
    date_sold = CASE WHEN new_status = 'sold' THEN now() ELSE date_sold END,
    updated_at = now()
  WHERE user_id = target_user_id 
    AND asin = target_asin;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  -- Get item details for confirmation
  SELECT jsonb_build_object(
    'id', id,
    'asin', asin,
    'sku', sku,
    'title', title,
    'status', status,
    'quantity', quantity,
    'serial_number', serial_number,
    'date_sold', date_sold,
    'updated_at', updated_at
  ) INTO item_info
  FROM public.asin_inventory
  WHERE user_id = target_user_id 
    AND asin = target_asin
  LIMIT 1;
  
  RETURN QUERY SELECT update_count, COALESCE(item_info, '{}'::jsonb);
END;
$$;

-- Update the specific ASIN B0DYG3Q2Q5 to sold status
SELECT * FROM public.update_asin_inventory_status_by_asin('B0DYG3Q2Q5', 'sold');