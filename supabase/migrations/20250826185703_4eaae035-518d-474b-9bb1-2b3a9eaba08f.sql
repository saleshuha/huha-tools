-- Step 1: Clean up existing PO data completely to start fresh
DELETE FROM public.po_upload_job_errors;
DELETE FROM public.po_upload_jobs;
DELETE FROM public.po_orders;

-- Step 2: Add computed columns for normalized identity
ALTER TABLE public.po_orders 
ADD COLUMN IF NOT EXISTS po_key text GENERATED ALWAYS AS (lower(trim(po_number))) STORED,
ADD COLUMN IF NOT EXISTS item_key text GENERATED ALWAYS AS (lower(trim(coalesce(nullif(model_number, ''), nullif(asin, ''), sku_code)))) STORED;

-- Step 3: Add unique constraint to prevent duplicates
DROP INDEX IF EXISTS idx_po_orders_unique_identity;
CREATE UNIQUE INDEX idx_po_orders_unique_identity ON public.po_orders (user_id, po_key, item_key);

-- Step 4: Update deduplication function to use identity keys
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