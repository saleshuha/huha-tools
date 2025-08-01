-- Create a function to get noon sales upload summary with accurate counts
CREATE OR REPLACE FUNCTION public.get_noon_sales_upload_summary(country_filter text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid,
  store_name text,
  report_month text,
  upload_date timestamp with time zone,
  record_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    gen_random_uuid() as id,
    COALESCE(s.name, 'Unknown Store') as store_name,
    nsd.report_month,
    MIN(nsd.upload_date) as upload_date,
    COUNT(*) as record_count
  FROM public.noon_sales_data nsd
  LEFT JOIN public.stores s ON s.id = nsd.store_id
  WHERE nsd.user_id = auth.uid()
    AND (country_filter IS NULL OR nsd.country_code = country_filter)
  GROUP BY nsd.store_id, nsd.report_month, s.name
  ORDER BY MIN(nsd.upload_date) DESC;
END;
$function$