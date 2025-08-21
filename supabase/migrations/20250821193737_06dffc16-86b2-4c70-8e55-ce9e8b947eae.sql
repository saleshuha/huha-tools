-- Create function to get comprehensive PO totals for summary
CREATE OR REPLACE FUNCTION public.get_po_totals_raw(user_id_param uuid)
RETURNS TABLE(
  total_records bigint,
  total_quantity bigint,
  active_records bigint,
  active_quantity bigint,
  delivered_records bigint,
  delivered_quantity bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_records,
    SUM(po.quantity)::bigint as total_quantity,
    COUNT(CASE WHEN po.status IN ('pending', 'ordered', 'shipped') THEN 1 END) as active_records,
    SUM(CASE WHEN po.status IN ('pending', 'ordered', 'shipped') THEN po.quantity ELSE 0 END)::bigint as active_quantity,
    COUNT(CASE WHEN po.status = 'delivered' THEN 1 END) as delivered_records,
    SUM(CASE WHEN po.status = 'delivered' THEN po.quantity ELSE 0 END)::bigint as delivered_quantity
  FROM public.po_orders po
  WHERE po.user_id = user_id_param;
END;
$function$