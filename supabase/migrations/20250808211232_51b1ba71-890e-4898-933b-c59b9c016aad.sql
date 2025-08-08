-- Let's check the actual count and create a new function that explicitly handles pagination
-- First, let's see what the real count is
SELECT COUNT(*) FROM po_orders WHERE user_id = '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1';

-- Now let's create a new function that bypasses any limits
CREATE OR REPLACE FUNCTION public.get_all_po_orders_unlimited(user_id_param uuid)
RETURNS SETOF po_orders
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM public.po_orders 
  WHERE user_id = user_id_param 
  ORDER BY created_at DESC;
$function$;