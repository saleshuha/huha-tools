-- Fix PO deduplication - direct approach

-- Update all major PO functions to handle deduplication properly
CREATE OR REPLACE FUNCTION public.get_all_po_orders_deduplicated(user_id_param uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  po_number text,
  sku_code text,
  quantity integer,
  status text,
  order_date timestamp with time zone,
  expected_delivery timestamp with time zone,
  notes text,
  file_name text,
  country text,
  currency text,
  unit_cost numeric,
  total_cost numeric,
  sku_user_id uuid,
  supplier_order_number text,
  tracking_number text,
  tracking_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  ship_to_location text,
  asin text,
  model_number text,
  title text,
  external_id text,
  external_id_type text,
  sunsky_sku jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (po.po_number, po.sku_code, COALESCE(po.unit_cost, 0))
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
    po.ship_to_location,
    po.asin,
    po.model_number,
    po.title,
    po.external_id,
    po.external_id_type,
    CASE 
      WHEN s.id IS NOT NULL THEN
        jsonb_build_object(
          'id', s.id,
          'user_id', s.user_id,
          'sku_code', s.sku_code,
          'title', s.title,
          'cost', s.cost,
          'weight', s.weight,
          'currency', s.currency,
          'country', s.country,
          'created_at', s.created_at,
          'updated_at', s.updated_at
        )
      ELSE NULL
    END as sunsky_sku
  FROM public.po_orders po
  LEFT JOIN public.sunsky_skus s ON s.user_id = po.user_id AND (
    s.sku_code = po.sku_code OR 
    (po.model_number IS NOT NULL AND po.model_number != '' AND s.sku_code = po.model_number)
  )
  WHERE po.user_id = user_id_param
  ORDER BY po.po_number, po.sku_code, COALESCE(po.unit_cost, 0),
           -- Priority: closed/delivered > shipped > ordered > pending
           CASE po.status
             WHEN 'closed' THEN 1
             WHEN 'delivered' THEN 1
             WHEN 'shipped' THEN 2
             WHEN 'ordered' THEN 3
             WHEN 'pending' THEN 4
             ELSE 5
           END,
           po.created_at DESC;
END;
$function$;

-- Update procurement unified to use deduplication
CREATE OR REPLACE FUNCTION public.get_procurement_unified_items(country_filter text DEFAULT NULL::text)
RETURNS TABLE(
  source text, 
  item_id uuid, 
  po_id uuid, 
  po_number text, 
  sku text, 
  model_number text, 
  title text, 
  quantity integer, 
  status text, 
  supplier_order_number text, 
  sunsky_order_number text, 
  sunsky_item_status text, 
  tracking_number text, 
  expected_ship_date timestamp with time zone, 
  status_last_updated_at timestamp with time zone, 
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Restock candidates (inventory at 0 and not yet ordered)
  RETURN QUERY
  SELECT
    'restock'::text as source,
    inv.id as item_id,
    NULL::uuid as po_id,
    NULL::text as po_number,
    inv.sku as sku,
    NULL::text as model_number,
    inv.title as title,
    inv.quantity,
    inv.status::text as status,
    NULL::text as supplier_order_number,
    NULL::text as sunsky_order_number,
    NULL::text as sunsky_item_status,
    NULL::text as tracking_number,
    NULL::timestamptz as expected_ship_date,
    inv.updated_at as status_last_updated_at,
    inv.created_at
  FROM (
    SELECT 
      ai.id, ai.user_id, ai.quantity, ai.status, ai.created_at, ai.updated_at,
      ai.sku, ai.asin as title, ai.country
    FROM public.asin_inventory ai
    UNION ALL
    SELECT 
      si.id, si.user_id, si.quantity, si.status, si.created_at, si.updated_at,
      si.sku_number as sku, si.sku_number as title, si.country
    FROM public.sku_inventory si
  ) inv
  WHERE inv.user_id = auth.uid()
    AND inv.quantity = 0
    AND inv.status::text <> 'ordered'
    AND (country_filter IS NULL OR inv.country = country_filter)

  UNION ALL

  -- PO line items (deduplicated)
  SELECT
    'po'::text as source,
    NULL::uuid as item_id,
    po.id as po_id,
    po.po_number,
    po.sku_code as sku,
    po.model_number,
    COALESCE(po.title, po.sku_code, po.model_number) as title,
    po.quantity,
    po.status,
    po.supplier_order_number,
    po.supplier_order_number as sunsky_order_number,
    NULL::text as sunsky_item_status,
    po.tracking_number,
    NULL::timestamptz as expected_ship_date,
    po.updated_at as status_last_updated_at,
    po.created_at
  FROM (
    -- Deduplicated PO orders
    SELECT DISTINCT ON (po.po_number, po.sku_code, COALESCE(po.unit_cost, 0))
           po.id, po.po_number, po.sku_code, po.model_number, po.title,
           po.quantity, po.status, po.supplier_order_number, po.tracking_number,
           po.updated_at, po.created_at, po.country
    FROM public.po_orders po
    WHERE po.user_id = auth.uid()
    ORDER BY po.po_number, po.sku_code, COALESCE(po.unit_cost, 0),
             CASE po.status
               WHEN 'closed' THEN 1
               WHEN 'delivered' THEN 1
               WHEN 'shipped' THEN 2
               WHEN 'ordered' THEN 3
               WHEN 'pending' THEN 4
               ELSE 5
             END,
             po.created_at DESC
  ) po
  WHERE (country_filter IS NULL OR po.country = country_filter)

  UNION ALL

  -- Sunsky orders remain the same
  SELECT
    'sunsky'::text as source,
    NULL::uuid as item_id,
    NULL::uuid as po_id,
    COALESCE(
      CASE WHEN so.po_numbers IS NOT NULL AND array_length(so.po_numbers, 1) > 0 
        THEN so.po_numbers[1] 
        ELSE NULL 
      END,
      (SELECT po.po_number FROM public.po_orders po 
        WHERE po.user_id = so.user_id 
          AND po.supplier_order_number = so.number 
        ORDER BY po.created_at DESC NULLS LAST 
        LIMIT 1),
      'APP-PLACED'
    ) as po_number,
    COALESCE(soi.sku_code, 'N/A') as sku,
    soi.model_number,
    COALESCE(soi.title, so.number) as title,
    COALESCE(soi.quantity, 1) as quantity,
    COALESCE(so.status, 'unknown') as status,
    so.number as supplier_order_number,
    so.number as sunsky_order_number,
    soi.item_status as sunsky_item_status,
    so.tracking_number,
    soi.expected_ship_date,
    COALESCE(soi.status_last_updated_at, so.status_last_updated_at, so.updated_at) as status_last_updated_at,
    COALESCE(soi.created_at, so.created_at) as created_at
  FROM public.sunsky_orders so
  LEFT JOIN public.sunsky_order_items soi 
    ON soi.order_number = so.number AND soi.user_id = so.user_id
  WHERE so.user_id = auth.uid()
  ORDER BY created_at DESC;
END;
$function$;