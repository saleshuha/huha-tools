-- Fix the dashboard summary function with proper aggregation
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
SET search_path = 'public'
AS $$
DECLARE
    uploads_json jsonb;
    suppliers_json jsonb;
    breakdown_json jsonb;
BEGIN
    -- Get recent uploads
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'file_name', file_name,
            'upload_date', upload_date,
            'order_count', order_count
        ) ORDER BY upload_date DESC
    ), '[]'::jsonb)
    INTO uploads_json
    FROM (
        SELECT file_name, MAX(created_at) as upload_date, COUNT(*) as order_count
        FROM public.po_orders
        WHERE user_id = user_id_param
            AND created_at >= now() - interval '30 days'
            AND file_name IS NOT NULL
        GROUP BY file_name
        ORDER BY MAX(created_at) DESC
        LIMIT 5
    ) recent;

    -- Get top suppliers
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
               po.po_number, po.total_cost, po.created_at
        FROM public.po_orders po
        WHERE po.user_id = user_id_param
            AND po.status IN ('pending', 'ordered', 'shipped')
        ORDER BY po.po_number, po.sku_code, po.unit_cost, po.created_at DESC
    ) dedup
    GROUP BY po_number
    ORDER BY SUM(COALESCE(total_cost, 0)) DESC
    LIMIT 5;

    -- Return the main query with fixed CTEs
    RETURN QUERY
    WITH active_orders AS (
        SELECT DISTINCT ON (po.po_number, po.sku_code, po.unit_cost)
            po.po_number, po.sku_code, po.quantity, po.status, po.unit_cost, po.total_cost,
            po.created_at, po.file_name
        FROM public.po_orders po
        WHERE po.user_id = user_id_param
            AND po.status IN ('pending', 'ordered', 'shipped')
        ORDER BY po.po_number, po.sku_code, po.unit_cost, po.created_at DESC
    )
    SELECT 
        COUNT(*)::bigint as total_active_orders,
        SUM(ao.quantity)::bigint as total_active_quantity,
        SUM(COALESCE(ao.total_cost, 0))::numeric as total_active_value,
        COUNT(DISTINCT ao.po_number)::bigint as unique_po_numbers,
        COUNT(CASE WHEN ao.status = 'pending' THEN 1 END)::bigint as pending_orders,
        COUNT(CASE WHEN ao.status = 'ordered' THEN 1 END)::bigint as ordered_orders,
        COUNT(CASE WHEN ao.status = 'shipped' THEN 1 END)::bigint as shipped_orders,
        uploads_json as recent_uploads,
        suppliers_json as top_suppliers,
        jsonb_build_object(
            'pending', COUNT(CASE WHEN ao.status = 'pending' THEN 1 END),
            'ordered', COUNT(CASE WHEN ao.status = 'ordered' THEN 1 END),
            'shipped', COUNT(CASE WHEN ao.status = 'shipped' THEN 1 END)
        ) as status_breakdown
    FROM active_orders ao;
END;
$$;