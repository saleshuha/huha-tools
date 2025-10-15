-- Drop and recreate get_po_group_metrics to count ALL line items
DROP FUNCTION IF EXISTS public.get_po_group_metrics(uuid);

CREATE OR REPLACE FUNCTION public.get_po_group_metrics(user_id_param uuid)
RETURNS TABLE(po_number text, total_line_items bigint, asn_quantity bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    po.po_number,
    COUNT(*)::bigint as total_line_items,  -- Count ALL rows, not distinct ASINs
    SUM(po.quantity)::bigint as asn_quantity
  FROM public.po_orders po
  WHERE po.user_id = user_id_param
  GROUP BY po.po_number
  ORDER BY po.po_number;
END;
$function$;