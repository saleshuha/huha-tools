-- Fix security warnings by setting proper search_path for functions
CREATE OR REPLACE FUNCTION public.get_all_po_orders_deduplicated(user_id_param uuid)
RETURNS TABLE(
  id uuid, user_id uuid, po_number text, sku_code text, quantity integer, status text,
  order_date timestamp with time zone, expected_delivery timestamp with time zone, 
  notes text, file_name text, country text, currency text, unit_cost numeric, 
  total_cost numeric, sku_user_id uuid, supplier_order_number text, tracking_number text, 
  tracking_url text, created_at timestamp with time zone, updated_at timestamp with time zone,
  ship_to_location text, asin text, model_number text, title text, external_id text, 
  external_id_type text, sunsky_sku jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    po.id, po.user_id, po.po_number, po.sku_code, po.quantity, po.status,
    po.order_date, po.expected_delivery, po.notes, po.file_name, po.country,
    po.currency, po.unit_cost, po.total_cost, po.sku_user_id, po.supplier_order_number,
    po.tracking_number, po.tracking_url, po.created_at, po.updated_at,
    po.ship_to_location, po.asin, po.model_number, po.title, po.external_id,
    po.external_id_type,
    CASE 
      WHEN s.id IS NOT NULL THEN
        jsonb_build_object(
          'id', s.id, 'user_id', s.user_id, 'sku_code', s.sku_code,
          'title', s.title, 'cost', s.cost, 'weight', s.weight,
          'currency', s.currency, 'country', s.country,
          'created_at', s.created_at, 'updated_at', s.updated_at
        )
      ELSE NULL
    END as sunsky_sku
  FROM public.po_orders po
  LEFT JOIN public.sunsky_skus s ON s.user_id = po.user_id AND (
    s.sku_code = po.item_key OR 
    s.sku_code = po.sku_code OR
    s.sku_code = po.model_number
  )
  WHERE po.user_id = user_id_param
  ORDER BY po.created_at DESC;
END;
$function$;

-- Update dashboard function with proper search_path
CREATE OR REPLACE FUNCTION public.get_po_dashboard_summary_deduplicated(user_id_param uuid)
RETURNS TABLE(
  total_active_orders bigint, total_active_quantity bigint, total_active_value numeric,
  unique_po_numbers bigint, pending_orders bigint, ordered_orders bigint, 
  shipped_orders bigint, recent_uploads jsonb, top_suppliers jsonb, status_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    uploads_json jsonb;
    suppliers_json jsonb;
    breakdown_json jsonb;
BEGIN
    -- Get recent uploads (deduplicated by file)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'file_name', file_name,
            'upload_date', upload_date,
            'order_count', order_count
        ) ORDER BY upload_date DESC
    ), '[]'::jsonb)
    INTO uploads_json
    FROM (
        SELECT DISTINCT ON (file_name)
               file_name, 
               MAX(created_at) as upload_date, 
               COUNT(DISTINCT po_key || '-' || item_key) as order_count
        FROM public.po_orders
        WHERE user_id = user_id_param
            AND created_at >= now() - interval '30 days'
            AND file_name IS NOT NULL
        GROUP BY file_name
        ORDER BY file_name, MAX(created_at) DESC
        LIMIT 5
    ) recent;

    -- Get top suppliers by value (deduplicated by identity)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'po_number', po_number,
            'total_value', total_value,
            'order_count', order_count
        ) ORDER BY total_value DESC
    ), '[]'::jsonb)
    INTO suppliers_json
    FROM (
        SELECT DISTINCT ON (po.po_key, po.item_key)
               po.po_number,
               SUM(po.total_cost) OVER (PARTITION BY po.po_number) as total_value,
               COUNT(*) OVER (PARTITION BY po.po_number) as order_count
        FROM public.po_orders po
        WHERE po.user_id = user_id_param
            AND po.status IN ('pending', 'ordered', 'shipped', 'closed')
            AND po.total_cost IS NOT NULL
        ORDER BY po.po_key, po.item_key, po.created_at DESC
        LIMIT 10
    ) suppliers;

    -- Get status breakdown (deduplicated by identity)
    SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
    INTO breakdown_json
    FROM (
        SELECT status, COUNT(*) as count
        FROM (
            SELECT DISTINCT ON (po.po_key, po.item_key) po.status
            FROM public.po_orders po
            WHERE po.user_id = user_id_param
            ORDER BY po.po_key, po.item_key, po.created_at DESC
        ) deduped
        GROUP BY status
    ) status_summary;

    -- Return deduplicated summary metrics
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_active_orders,
        SUM(deduped.quantity)::bigint as total_active_quantity,
        SUM(deduped.total_cost) as total_active_value,
        COUNT(DISTINCT deduped.po_number)::bigint as unique_po_numbers,
        COUNT(CASE WHEN deduped.status = 'pending' THEN 1 END)::bigint as pending_orders,
        COUNT(CASE WHEN deduped.status = 'ordered' THEN 1 END)::bigint as ordered_orders,
        COUNT(CASE WHEN deduped.status = 'shipped' THEN 1 END)::bigint as shipped_orders,
        uploads_json as recent_uploads,
        suppliers_json as top_suppliers,
        breakdown_json as status_breakdown
    FROM (
        SELECT DISTINCT ON (po.po_key, po.item_key)
               po.po_number, po.quantity, po.status, po.total_cost
        FROM public.po_orders po
        WHERE po.user_id = user_id_param
            AND po.status IN ('pending', 'ordered', 'shipped', 'closed')
        ORDER BY po.po_key, po.item_key, po.created_at DESC
    ) deduped;
END;
$function$;