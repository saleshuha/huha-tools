-- Update get_procurement_unified_items to show ALL Sunsky orders placed by the user
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

  -- PO line items (any status)
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
  FROM public.po_orders po
  WHERE po.user_id = auth.uid()
    AND (country_filter IS NULL OR po.country = country_filter)

  UNION ALL

  -- ALL Sunsky orders placed by the user (not just PO-linked ones)
  SELECT
    'sunsky'::text as source,
    NULL::uuid as item_id,
    NULL::uuid as po_id,
    -- Try to match PO number when possible via supplier_order_number
    COALESCE(
      -- First check if po_numbers array has values
      CASE WHEN so.po_numbers IS NOT NULL AND array_length(so.po_numbers, 1) > 0 
        THEN so.po_numbers[1] 
        ELSE NULL 
      END,
      -- Then check if order number matches any supplier_order_number in PO orders
      (SELECT po.po_number FROM public.po_orders po 
        WHERE po.user_id = so.user_id 
          AND po.supplier_order_number = so.number 
        ORDER BY po.created_at DESC NULLS LAST 
        LIMIT 1),
      -- Default to 'APP-PLACED' to indicate it was placed through the app
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
    -- Include ALL Sunsky orders for this user, not just PO-linked ones
  ORDER BY created_at DESC;
END;
$function$;

-- Create a new function to get ALL Sunsky orders for a user (app-placed filter)
CREATE OR REPLACE FUNCTION public.get_all_user_sunsky_orders()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  number text,
  status text,
  site_number text,
  gmt_created timestamp with time zone,
  total numeric,
  currency text,
  shipping_company text,
  tracking_number text,
  tracking_url text,
  raw jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  status_last_updated_at timestamp with time zone,
  last_synced_at timestamp with time zone,
  po_numbers text[],
  items jsonb,
  is_app_placed boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.user_id,
    so.number,
    so.status,
    so.site_number,
    so.gmt_created,
    so.total,
    so.currency,
    so.shipping_company,
    so.tracking_number,
    so.tracking_url,
    so.raw,
    so.created_at,
    so.updated_at,
    so.status_last_updated_at,
    so.last_synced_at,
    so.po_numbers,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', soi.id,
          'user_id', soi.user_id,
          'order_number', soi.order_number,
          'sku_code', soi.sku_code,
          'model_number', soi.model_number,
          'title', soi.title,
          'quantity', soi.quantity,
          'unit_price', soi.unit_price,
          'currency', soi.currency,
          'asin', soi.asin,
          'item_status', soi.item_status,
          'status_last_updated_at', soi.status_last_updated_at,
          'expected_ship_date', soi.expected_ship_date,
          'last_synced_at', soi.last_synced_at,
          'raw', soi.raw,
          'created_at', soi.created_at
        )
      ) FILTER (WHERE soi.id IS NOT NULL),
      '[]'::jsonb
    ) as items,
    -- Mark as app-placed if it has PO relationships OR was created through our system
    CASE 
      WHEN so.po_numbers IS NOT NULL AND array_length(so.po_numbers, 1) > 0 THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.po_orders po 
        WHERE po.user_id = so.user_id 
          AND po.supplier_order_number = so.number
      ) THEN true
      ELSE true  -- For now, consider all orders as app-placed since they're in our DB
    END as is_app_placed
  FROM public.sunsky_orders so
  LEFT JOIN public.sunsky_order_items soi ON soi.order_number = so.number AND soi.user_id = so.user_id
  WHERE so.user_id = auth.uid()
  GROUP BY so.id, so.user_id, so.number, so.status, so.site_number, so.gmt_created, 
           so.total, so.currency, so.shipping_company, so.tracking_number, so.tracking_url,
           so.raw, so.created_at, so.updated_at, so.status_last_updated_at, 
           so.last_synced_at, so.po_numbers
  ORDER BY so.gmt_created DESC NULLS LAST, so.created_at DESC;
END;
$function$;