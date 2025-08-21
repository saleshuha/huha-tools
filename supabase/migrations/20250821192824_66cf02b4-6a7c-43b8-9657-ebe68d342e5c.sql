-- Create function to get PO reconciliation summary
CREATE OR REPLACE FUNCTION public.get_po_reconciliation_summary(user_id_param uuid)
RETURNS TABLE(
  total_raw_records bigint, total_raw_quantity bigint,
  total_deduplicated_records bigint, total_deduplicated_quantity bigint,
  duplicate_records bigint, quantity_difference bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH raw_data AS (
    SELECT COUNT(*) as raw_count, SUM(quantity)::bigint as raw_qty
    FROM public.po_orders
    WHERE user_id = user_id_param AND status IN ('pending', 'ordered', 'shipped')
  ),
  deduplicated_data AS (
    SELECT COUNT(*) as dedup_count, SUM(quantity)::bigint as dedup_qty
    FROM (
      SELECT DISTINCT ON (po_number, sku_code, unit_cost) quantity
      FROM public.po_orders
      WHERE user_id = user_id_param AND status IN ('pending', 'ordered', 'shipped')
      ORDER BY po_number, sku_code, unit_cost, created_at DESC
    ) dedup
  )
  SELECT 
    r.raw_count as total_raw_records,
    r.raw_qty as total_raw_quantity,
    d.dedup_count as total_deduplicated_records,
    d.dedup_qty as total_deduplicated_quantity,
    (r.raw_count - d.dedup_count) as duplicate_records,
    (r.raw_qty - d.dedup_qty) as quantity_difference
  FROM raw_data r, deduplicated_data d;
END;
$function$