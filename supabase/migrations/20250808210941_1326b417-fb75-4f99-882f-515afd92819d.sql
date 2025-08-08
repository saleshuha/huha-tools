-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_all_po_orders(uuid);

-- Recreate the function with the correct return type including all fields
CREATE OR REPLACE FUNCTION public.get_all_po_orders(user_id_param uuid)
 RETURNS TABLE(id uuid, user_id uuid, po_number text, sku_code text, quantity integer, status text, order_date timestamp with time zone, expected_delivery timestamp with time zone, notes text, file_name text, country text, currency text, unit_cost numeric, total_cost numeric, sku_user_id uuid, supplier_order_number text, tracking_number text, tracking_url text, created_at timestamp with time zone, updated_at timestamp with time zone, sunsky_sku jsonb, ship_to_location text, asin text, model_number text, title text, external_id text, external_id_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    po.id,
    po.user_id,
    po.po_number,
    po.sku_code,
    po.quantity,
    po.status,
    po.order_date,
    po.expected_delivery,
    po.notes,
    po.file_name,
    po.country,
    po.currency,
    po.unit_cost,
    po.total_cost,
    po.sku_user_id,
    po.supplier_order_number,
    po.tracking_number,
    po.tracking_url,
    po.created_at,
    po.updated_at,
    CASE 
      WHEN s.id IS NOT NULL THEN
        jsonb_build_object(
          'id', s.id,
          'user_id', s.user_id,
          'sku_code', s.sku_code,
          'title', s.title,
          'description', s.description,
          'cost', s.cost,
          'weight', s.weight,
          'notes', s.notes,
          'currency', s.currency,
          'country', s.country,
          'created_at', s.created_at,
          'updated_at', s.updated_at
        )
      ELSE NULL
    END as sunsky_sku,
    po.ship_to_location,
    po.asin,
    po.model_number,
    po.title,
    po.external_id,
    po.external_id_type
  FROM public.po_orders po
  LEFT JOIN public.sunsky_skus s ON s.sku_code = po.sku_code AND s.user_id = po.user_id
  WHERE po.user_id = user_id_param
  ORDER BY po.created_at DESC;
END;
$function$