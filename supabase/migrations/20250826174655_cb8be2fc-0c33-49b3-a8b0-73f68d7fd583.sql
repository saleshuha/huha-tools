
-- 1) Unified procurement data RPC
CREATE OR REPLACE FUNCTION public.get_procurement_unified_items(country_filter text DEFAULT NULL)
RETURNS TABLE(
  source text,                      -- 'restock' | 'po' | 'sunsky'
  item_id uuid,                     -- inventory item id (restock) or null
  po_id uuid,                       -- po_orders.id (for PO source) or null
  po_number text,                   -- PO number for POs; also used when available for Sunsky items via join
  sku text,
  model_number text,
  title text,
  quantity integer,
  status text,                      -- inventory status or po status or sunsky order status
  supplier_order_number text,       -- Sunsky order number copied into PO lines when available
  sunsky_order_number text,         -- Sunsky order number (for sunsky items); for PO returns supplier_order_number
  sunsky_item_status text,          -- per-item status (sunsky_order_items.item_status)
  tracking_number text,
  expected_ship_date timestamptz,
  status_last_updated_at timestamptz,
  created_at timestamptz
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

  -- Sunsky order items (linked via order_number; optionally match back to PO by supplier_order_number)
  SELECT
    'sunsky'::text as source,
    NULL::uuid as item_id,
    NULL::uuid as po_id,
    -- Try to show PO number when we can match via supplier_order_number = so.number
    (SELECT po.po_number FROM public.po_orders po 
      WHERE po.user_id = so.user_id 
        AND po.supplier_order_number = so.number 
      ORDER BY po.created_at DESC NULLS LAST 
      LIMIT 1) as po_number,
    soi.sku_code as sku,
    soi.model_number,
    soi.title,
    soi.quantity,
    so.status,
    NULL::text as supplier_order_number,
    so.number as sunsky_order_number,
    soi.item_status as sunsky_item_status,
    so.tracking_number,
    soi.expected_ship_date,
    soi.status_last_updated_at,
    soi.created_at
  FROM public.sunsky_orders so
  LEFT JOIN public.sunsky_order_items soi 
    ON soi.order_number = so.number AND soi.user_id = so.user_id
  WHERE so.user_id = auth.uid()
  ORDER BY created_at DESC;
END;
$function$;

-- 2) Helpful indexes to speed up the unified query
CREATE INDEX IF NOT EXISTS idx_po_orders_user_status ON public.po_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_po_orders_user_supplier ON public.po_orders(user_id, supplier_order_number);
CREATE INDEX IF NOT EXISTS idx_sunsky_order_items_user_order_sku ON public.sunsky_order_items(user_id, order_number, sku_code);
CREATE INDEX IF NOT EXISTS idx_sunsky_orders_user_number ON public.sunsky_orders(user_id, number);
