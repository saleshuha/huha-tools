-- Create function to get raw PO metrics (no deduplication)
CREATE OR REPLACE FUNCTION public.get_active_po_metrics_raw(user_id_param uuid)
RETURNS TABLE(
  total_active_orders bigint, total_active_quantity bigint, 
  unique_po_numbers bigint, pending_orders bigint, 
  ordered_orders bigint, shipped_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_active_orders,
    SUM(po.quantity)::bigint as total_active_quantity,
    COUNT(DISTINCT po.po_number) as unique_po_numbers,
    COUNT(CASE WHEN po.status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN po.status = 'ordered' THEN 1 END) as ordered_orders,
    COUNT(CASE WHEN po.status = 'shipped' THEN 1 END) as shipped_orders
  FROM public.po_orders po
  WHERE po.user_id = user_id_param
    AND po.status IN ('pending', 'ordered', 'shipped');
END;
$function$