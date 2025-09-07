-- Add missing api_key column to sunsky_credentials table
ALTER TABLE public.sunsky_credentials 
ADD COLUMN IF NOT EXISTS api_key text;

-- Add missing api_secret column to sunsky_credentials table  
ALTER TABLE public.sunsky_credentials 
ADD COLUMN IF NOT EXISTS api_secret text;

-- Update the get_user_sunsky_credentials_secure function to include the new columns
CREATE OR REPLACE FUNCTION public.get_user_sunsky_credentials_secure()
 RETURNS TABLE(id uuid, user_id uuid, name text, is_active boolean, last_tested timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, key_last4 text, api_key text, api_secret text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.user_id,
    sc.name,
    sc.is_active,
    sc.last_tested,
    sc.created_at,
    sc.updated_at,
    sc.key_last4,
    sc.api_key,
    sc.api_secret
  FROM public.sunsky_credentials sc
  WHERE sc.user_id = auth.uid();
END;
$function$;