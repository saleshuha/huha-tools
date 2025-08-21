-- Create function to get active PO orders with proper deduplication
CREATE OR REPLACE FUNCTION public.get_active_po_orders_latest(user_id_param uuid)
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
   external_id_type text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (po.po_number, po.sku_code, po.unit_cost)
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
    po.external_id_type
  FROM public.po_orders po
  WHERE po.user_id = user_id_param
    AND po.status IN ('pending', 'ordered', 'shipped')
  ORDER BY po.po_number, po.sku_code, po.unit_cost, po.created_at DESC;
END;
$function$;

-- Create function to get accurate PO metrics
CREATE OR REPLACE FUNCTION public.get_active_po_metrics(user_id_param uuid)
 RETURNS TABLE(
   total_active_orders bigint,
   total_active_quantity bigint,
   unique_po_numbers bigint,
   pending_orders bigint,
   ordered_orders bigint,
   shipped_orders bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_active_orders,
    SUM(po.quantity)::bigint as total_active_quantity,
    COUNT(DISTINCT po.po_number) as unique_po_numbers,
    COUNT(CASE WHEN po.status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN po.status = 'ordered' THEN 1 END) as ordered_orders,
    COUNT(CASE WHEN po.status = 'shipped' THEN 1 END) as shipped_orders
  FROM (
    SELECT DISTINCT ON (po_number, sku_code, unit_cost)
      po_number,
      sku_code,
      quantity,
      status,
      unit_cost
    FROM public.po_orders
    WHERE user_id = user_id_param
      AND status IN ('pending', 'ordered', 'shipped')
    ORDER BY po_number, sku_code, unit_cost, created_at DESC
  ) po;
END;
$function$;

-- Create function to get all PO orders with proper deduplication
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
  SELECT DISTINCT ON (po.po_number, po.sku_code, po.unit_cost)
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
  ORDER BY po.po_number, po.sku_code, po.unit_cost, po.created_at DESC;
END;
$function$;