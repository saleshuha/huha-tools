-- Create function to get job item statistics
CREATE OR REPLACE FUNCTION public.get_job_item_stats(job_id_param uuid)
RETURNS TABLE(total bigint, completed bigint, errors bigint, pending bigint, processing bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing
  FROM public.po_job_items
  WHERE job_id = job_id_param;
END;
$$;