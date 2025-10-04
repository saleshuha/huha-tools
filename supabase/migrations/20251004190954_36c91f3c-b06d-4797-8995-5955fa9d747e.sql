-- Drop the old function
DROP FUNCTION IF EXISTS public.get_po_group_metrics(uuid);

-- Recreate with corrected logic to show all quantities regardless of status
CREATE OR REPLACE FUNCTION public.get_po_group_metrics(user_id_param uuid)
RETURNS TABLE(po_number text, distinct_skus bigint, asn_quantity bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    po.po_number,
    COUNT(DISTINCT COALESCE(po.sku_code, po.model_number, po.asin, po.id::text)) AS distinct_skus,
    COALESCE(SUM(po.quantity), 0)::bigint AS asn_quantity
  FROM public.po_orders po
  WHERE po.user_id = user_id_param
  GROUP BY po.po_number
$$;