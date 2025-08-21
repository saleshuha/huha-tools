-- Create upload jobs table for better PO processing management
CREATE TABLE public.po_upload_jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    file_name text NOT NULL,
    file_size bigint,
    total_rows integer,
    processed_rows integer DEFAULT 0,
    success_rows integer DEFAULT 0,
    error_rows integer DEFAULT 0,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    error_message text,
    processing_details jsonb DEFAULT '{}'::jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.po_upload_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for po_upload_jobs
CREATE POLICY "Users can view their own upload jobs"
ON public.po_upload_jobs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own upload jobs"
ON public.po_upload_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload jobs"
ON public.po_upload_jobs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upload jobs"
ON public.po_upload_jobs
FOR DELETE
USING (auth.uid() = user_id);

-- Create upload job errors table for detailed error tracking
CREATE TABLE public.po_upload_job_errors (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES public.po_upload_jobs(id) ON DELETE CASCADE,
    row_number integer NOT NULL,
    error_type text NOT NULL,
    error_message text NOT NULL,
    row_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for job errors
ALTER TABLE public.po_upload_job_errors ENABLE ROW LEVEL SECURITY;

-- Create policies for po_upload_job_errors
CREATE POLICY "Users can view errors for their own jobs"
ON public.po_upload_job_errors
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.po_upload_jobs j 
    WHERE j.id = job_id AND j.user_id = auth.uid()
));

CREATE POLICY "System can create job errors"
ON public.po_upload_job_errors
FOR INSERT
WITH CHECK (true);

-- Add job_id to po_orders for better tracking
ALTER TABLE public.po_orders ADD COLUMN job_id uuid REFERENCES public.po_upload_jobs(id) ON DELETE SET NULL;

-- Create updated trigger for po_upload_jobs
CREATE OR REPLACE FUNCTION public.update_po_upload_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_po_upload_jobs_updated_at
    BEFORE UPDATE ON public.po_upload_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_po_upload_jobs_updated_at();

-- Create enhanced PO summary function
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
AS $$
BEGIN
    RETURN QUERY
    WITH active_orders AS (
        SELECT DISTINCT ON (po.po_number, po.sku_code, po.unit_cost)
            po.po_number, po.sku_code, po.quantity, po.status, po.unit_cost, po.total_cost,
            po.created_at, po.file_name
        FROM public.po_orders po
        WHERE po.user_id = user_id_param
            AND po.status IN ('pending', 'ordered', 'shipped')
        ORDER BY po.po_number, po.sku_code, po.unit_cost, po.created_at DESC
    ),
    recent_upload_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'file_name', file_name,
                'upload_date', upload_date,
                'order_count', order_count
            ) ORDER BY upload_date DESC
        ) as uploads
        FROM (
            SELECT file_name, MAX(created_at) as upload_date, COUNT(*) as order_count
            FROM public.po_orders
            WHERE user_id = user_id_param
                AND created_at >= now() - interval '30 days'
                AND file_name IS NOT NULL
            GROUP BY file_name
            ORDER BY MAX(created_at) DESC
            LIMIT 5
        ) recent
    ),
    supplier_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'po_number', po_number,
                'total_value', total_value,
                'order_count', order_count
            ) ORDER BY total_value DESC
        ) as suppliers
        FROM (
            SELECT po_number, SUM(COALESCE(total_cost, 0)) as total_value, COUNT(*) as order_count
            FROM active_orders
            GROUP BY po_number
            ORDER BY SUM(COALESCE(total_cost, 0)) DESC
            LIMIT 5
        ) top_pos
    )
    SELECT 
        COUNT(*) as total_active_orders,
        SUM(ao.quantity)::bigint as total_active_quantity,
        SUM(COALESCE(ao.total_cost, 0)) as total_active_value,
        COUNT(DISTINCT ao.po_number) as unique_po_numbers,
        COUNT(CASE WHEN ao.status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN ao.status = 'ordered' THEN 1 END) as ordered_orders,
        COUNT(CASE WHEN ao.status = 'shipped' THEN 1 END) as shipped_orders,
        COALESCE(rud.uploads, '[]'::jsonb) as recent_uploads,
        COALESCE(sd.suppliers, '[]'::jsonb) as top_suppliers,
        jsonb_build_object(
            'pending', COUNT(CASE WHEN ao.status = 'pending' THEN 1 END),
            'ordered', COUNT(CASE WHEN ao.status = 'ordered' THEN 1 END),
            'shipped', COUNT(CASE WHEN ao.status = 'shipped' THEN 1 END)
        ) as status_breakdown
    FROM active_orders ao
    CROSS JOIN recent_upload_data rud
    CROSS JOIN supplier_data sd;
END;
$$;