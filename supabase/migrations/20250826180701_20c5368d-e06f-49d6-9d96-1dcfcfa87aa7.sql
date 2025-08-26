
  -- Speed up lookups
CREATE INDEX IF NOT EXISTS idx_po_orders_user_supplier
  ON public.po_orders (user_id, supplier_order_number);

CREATE INDEX IF NOT EXISTS idx_sunsky_orders_user_number
  ON public.sunsky_orders (user_id, number);

-- Return ONLY orders placed via our app, and include their items and mapped credential
CREATE OR REPLACE FUNCTION public.get_all_user_sunsky_orders()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  number text,
  status text,
  site_number text,
  gmt_created timestamptz,
  total numeric,
  currency text,
  shipping_company text,
  tracking_number text,
  tracking_url text,
  raw jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  status_last_updated_at timestamptz,
  last_synced_at timestamptz,
  po_numbers text[],
  items jsonb,
  is_app_placed boolean,
  sunsky_credentials_id uuid
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
    ) AS items,
    -- Now "app-placed" is strictly defined by PO linkage or supplier_order_number match
    TRUE AS is_app_placed,
    (
      SELECT po.sunsky_credentials_id
      FROM public.po_orders po
      WHERE po.user_id = so.user_id
        AND po.supplier_order_number = so.number
        AND po.sunsky_credentials_id IS NOT NULL
      ORDER BY po.created_at DESC NULLS LAST
      LIMIT 1
    ) AS sunsky_credentials_id
  FROM public.sunsky_orders so
  LEFT JOIN public.sunsky_order_items soi 
    ON soi.order_number = so.number AND soi.user_id = so.user_id
  WHERE so.user_id = auth.uid()
    AND (
      (so.po_numbers IS NOT NULL AND cardinality(so.po_numbers) > 0)
      OR EXISTS (
        SELECT 1
        FROM public.po_orders po
        WHERE po.user_id = so.user_id
          AND po.supplier_order_number = so.number
      )
    )
  GROUP BY 
    so.id, so.user_id, so.number, so.status, so.site_number, so.gmt_created,
    so.total, so.currency, so.shipping_company, so.tracking_number, so.tracking_url,
    so.raw, so.created_at, so.updated_at, so.status_last_updated_at, so.last_synced_at,
    so.po_numbers
  ORDER BY so.gmt_created DESC NULLS LAST, so.created_at DESC;
END;
$function$;
  