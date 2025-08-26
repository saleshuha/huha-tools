-- Fix PO duplicates and summary calculations

-- 1. Create a function to clean up PO duplicates, keeping the most recent status
CREATE OR REPLACE FUNCTION public.cleanup_po_duplicates()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_rows INTEGER := 0;
BEGIN
  -- Delete older duplicate records, keeping the one with the latest status priority
  -- Priority: closed > shipped > ordered > pending
  WITH ranked_orders AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, po_number, sku_code, unit_cost
             ORDER BY 
               CASE status
                 WHEN 'closed' THEN 1
                 WHEN 'delivered' THEN 2  
                 WHEN 'shipped' THEN 3
                 WHEN 'ordered' THEN 4
                 WHEN 'pending' THEN 5
                 ELSE 6
               END,
               created_at DESC
           ) as rn
    FROM public.po_orders
    WHERE user_id = auth.uid()
  ),
  duplicates_to_delete AS (
    SELECT id FROM ranked_orders WHERE rn > 1
  )
  DELETE FROM public.po_orders 
  WHERE id IN (SELECT id FROM duplicates_to_delete);
  
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$function$;

-- 2. Update the PO summary function to handle duplicates properly
CREATE OR REPLACE FUNCTION public.get_po_dashboard_summary(user_id_param uuid)
RETURNS TABLE(
  total_active_orders bigint,
  total_active_quantity bigint, 
  total_active_value numeric,
  unique_po_numbers bigint,
  pending_orders bigint,
  ordered_orders bigint,
  shipped_orders bigint,
  recent_uploads jsonb,
  top_suppliers jsonb,
  status_breakdown jsonb
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
    -- Get recent uploads (deduplicated)
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
               COUNT(DISTINCT po_number || '-' || sku_code) as order_count
        FROM public.po_orders
        WHERE user_id = user_id_param
            AND created_at >= now() - interval '30 days'
            AND file_name IS NOT NULL
        GROUP BY file_name
        ORDER BY file_name, MAX(created_at) DESC
        LIMIT 5
    ) recent;

    -- Get top suppliers by value (deduplicated)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'po_number', po_number,
            'total_value', total_value,
            'order_count', order_count
        ) ORDER BY total_value DESC
    ), '[]'::jsonb)
    INTO suppliers_json
    FROM (
        SELECT DISTINCT ON (po.po_number, po.sku_code, po.unit_cost)
               po.po_number,
               SUM(po.total_cost) OVER (PARTITION BY po.po_number) as total_value,
               COUNT(*) OVER (PARTITION BY po.po_number) as order_count
        FROM public.po_orders po
        WHERE po.user_id = user_id_param
            AND po.status IN ('pending', 'ordered', 'shipped', 'closed')
            AND po.total_cost IS NOT NULL
        ORDER BY po.po_number, po.sku_code, po.unit_cost, 
                CASE po.status
                  WHEN 'closed' THEN 1
                  WHEN 'delivered' THEN 2
                  WHEN 'shipped' THEN 3  
                  WHEN 'ordered' THEN 4
                  WHEN 'pending' THEN 5
                  ELSE 6
                END,
                po.created_at DESC
        LIMIT 10
    ) suppliers;

    -- Get status breakdown (deduplicated) 
    SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
    INTO breakdown_json
    FROM (
        SELECT status, COUNT(*) as count
        FROM (
            SELECT DISTINCT ON (po.po_number, po.sku_code, po.unit_cost)
                   po.status
            FROM public.po_orders po
            WHERE po.user_id = user_id_param
            ORDER BY po.po_number, po.sku_code, po.unit_cost,
                    CASE po.status
                      WHEN 'closed' THEN 1
                      WHEN 'delivered' THEN 2
                      WHEN 'shipped' THEN 3
                      WHEN 'ordered' THEN 4  
                      WHEN 'pending' THEN 5
                      ELSE 6
                    END,
                    po.created_at DESC
        ) deduped
        GROUP BY status
    ) status_summary;

    -- Return deduplicated summary metrics
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_active_orders,
        SUM(po.quantity)::bigint as total_active_quantity,
        SUM(po.total_cost) as total_active_value,
        COUNT(DISTINCT po.po_number)::bigint as unique_po_numbers,
        COUNT(CASE WHEN po.status = 'pending' THEN 1 END)::bigint as pending_orders,
        COUNT(CASE WHEN po.status = 'ordered' THEN 1 END)::bigint as ordered_orders,
        COUNT(CASE WHEN po.status = 'shipped' THEN 1 END)::bigint as shipped_orders,
        uploads_json as recent_uploads,
        suppliers_json as top_suppliers, 
        breakdown_json as status_breakdown
    FROM (
        -- Deduplicated PO orders, keeping latest status
        SELECT DISTINCT ON (po.po_number, po.sku_code, po.unit_cost)
               po.po_number, po.status, po.quantity, po.total_cost
        FROM public.po_orders po
        WHERE po.user_id = user_id_param
            AND po.status IN ('pending', 'ordered', 'shipped')
        ORDER BY po.po_number, po.sku_code, po.unit_cost,
                CASE po.status
                  WHEN 'closed' THEN 1
                  WHEN 'delivered' THEN 2
                  WHEN 'shipped' THEN 3
                  WHEN 'ordered' THEN 4
                  WHEN 'pending' THEN 5
                  ELSE 6
                END,
                po.created_at DESC
    ) po;
END;
$function$;