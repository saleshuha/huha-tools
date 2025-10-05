-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_po_group_metrics(uuid);

-- Create updated function that sums ALL quantities regardless of status
CREATE OR REPLACE FUNCTION public.get_po_group_metrics(user_id_param uuid)
RETURNS TABLE(
  po_number text,
  distinct_skus bigint,
  asn_quantity bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.po_number,
    COUNT(DISTINCT po.asin) as distinct_skus,
    -- Sum ALL quantities regardless of status (includes closed/fulfilled items)
    SUM(po.quantity)::bigint as asn_quantity
  FROM public.po_orders po
  WHERE po.user_id = user_id_param
  GROUP BY po.po_number
  ORDER BY po.po_number;
END;
$$;