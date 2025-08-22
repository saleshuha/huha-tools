-- Fix the PO comprehensive metrics to correctly show placed and pending items
CREATE OR REPLACE FUNCTION public.get_po_comprehensive_metrics(user_id_param uuid)
 RETURNS TABLE(total_line_items bigint, total_quantity bigint, matched_line_items bigint, matched_quantity bigint, placed_line_items bigint, placed_quantity bigint, pending_line_items bigint, pending_quantity bigint, unique_po_numbers bigint, status_breakdown jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  status_counts jsonb;
BEGIN
  -- Get status breakdown
  SELECT jsonb_object_agg(status, count) INTO status_counts
  FROM (
    SELECT 
      po.status,
      COUNT(*) as count
    FROM public.po_orders po
    WHERE po.user_id = user_id_param
    GROUP BY po.status
  ) status_summary;

  -- Return comprehensive metrics with corrected logic
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_line_items,
    SUM(po.quantity)::bigint as total_quantity,
    COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END)::bigint as matched_line_items,
    SUM(CASE WHEN s.id IS NOT NULL THEN po.quantity ELSE 0 END)::bigint as matched_quantity,
    -- Placed items: orders that have been placed (ordered, shipped, delivered)
    COUNT(CASE WHEN po.status IN ('ordered', 'shipped', 'delivered') THEN 1 END)::bigint as placed_line_items,
    SUM(CASE WHEN po.status IN ('ordered', 'shipped', 'delivered') THEN po.quantity ELSE 0 END)::bigint as placed_quantity,
    -- Pending items: matched items (have sunsky_sku) that are still pending and need to be ordered
    COUNT(CASE WHEN s.id IS NOT NULL AND po.status = 'pending' THEN 1 END)::bigint as pending_line_items,
    SUM(CASE WHEN s.id IS NOT NULL AND po.status = 'pending' THEN po.quantity ELSE 0 END)::bigint as pending_quantity,
    COUNT(DISTINCT po.po_number)::bigint as unique_po_numbers,
    COALESCE(status_counts, '{}'::jsonb) as status_breakdown
  FROM public.po_orders po
  LEFT JOIN public.sunsky_skus s ON s.user_id = po.user_id AND (
    s.sku_code = po.sku_code OR 
    (po.model_number IS NOT NULL AND po.model_number != '' AND s.sku_code = po.model_number)
  )
  WHERE po.user_id = user_id_param;
END;
$function$