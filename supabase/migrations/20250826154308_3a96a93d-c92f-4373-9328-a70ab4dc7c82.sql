-- Fix remaining SECURITY DEFINER functions to have immutable search_path
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_exchange_rate(from_currency text, to_currency text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Simple hardcoded exchange rates for demo purposes
  -- In production, this would fetch from a real-time exchange rate API
  IF from_currency = 'USD' AND to_currency = 'AED' THEN
    RETURN 3.67;
  ELSIF from_currency = 'USD' AND to_currency = 'SAR' THEN
    RETURN 3.75;
  ELSIF from_currency = to_currency THEN
    RETURN 1.0;
  ELSE
    -- Default to 1:1 if conversion not found
    RETURN 1.0;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_po_upload_jobs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;