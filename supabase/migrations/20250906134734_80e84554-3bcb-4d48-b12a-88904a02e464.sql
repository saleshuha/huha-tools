-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns to sunsky_credentials table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sunsky_credentials' AND column_name = 'api_key_encrypted') THEN
    ALTER TABLE public.sunsky_credentials ADD COLUMN api_key_encrypted bytea;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sunsky_credentials' AND column_name = 'api_secret_encrypted') THEN
    ALTER TABLE public.sunsky_credentials ADD COLUMN api_secret_encrypted bytea;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sunsky_credentials' AND column_name = 'key_last4') THEN
    ALTER TABLE public.sunsky_credentials ADD COLUMN key_last4 text;
  END IF;
END $$;

-- Migrate existing plaintext credentials to encrypted format
-- This uses a placeholder encryption key - the real key will be in Edge Functions
UPDATE public.sunsky_credentials 
SET 
  api_key_encrypted = pgp_sym_encrypt(api_key, 'temp_key_will_be_replaced'),
  api_secret_encrypted = pgp_sym_encrypt(api_secret, 'temp_key_will_be_replaced'),
  key_last4 = CASE 
    WHEN length(api_key) >= 4 THEN right(api_key, 4)
    ELSE api_key
  END
WHERE api_key_encrypted IS NULL AND api_key IS NOT NULL;

-- Create secure view that only exposes safe data with security definer
CREATE OR REPLACE FUNCTION public.get_user_sunsky_credentials_secure()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  is_active boolean,
  last_tested timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  key_last4 text
)
SECURITY DEFINER
SET search_path TO public
LANGUAGE plpgsql
AS $$
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
    sc.key_last4
  FROM public.sunsky_credentials sc
  WHERE sc.user_id = auth.uid();
END;
$$;

-- Fix exchange_rates RLS - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON public.exchange_rates;
CREATE POLICY "Authenticated users can view exchange rates"
ON public.exchange_rates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix SECURITY DEFINER functions that are missing SET search_path
-- Update get_sunsky_slow_items function
CREATE OR REPLACE FUNCTION public.get_sunsky_slow_items(threshold_days integer DEFAULT 3)
 RETURNS TABLE(order_number text, sku_code text, title text, item_status text, days_in_status integer, expected_ship_date timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    soi.order_number,
    soi.sku_code,
    soi.title,
    soi.item_status,
    CASE 
      WHEN soi.status_last_updated_at IS NOT NULL 
      THEN EXTRACT(days FROM now() - soi.status_last_updated_at)::INTEGER
      ELSE EXTRACT(days FROM now() - soi.created_at)::INTEGER
    END as days_in_status,
    soi.expected_ship_date,
    soi.created_at
  FROM public.sunsky_order_items soi
  WHERE soi.user_id = auth.uid()
    AND (soi.item_status IS NULL OR soi.item_status NOT IN ('5', '6', 'shipped', 'delivered'))
    AND (
      (soi.status_last_updated_at IS NOT NULL AND EXTRACT(days FROM now() - soi.status_last_updated_at) > threshold_days) OR
      (soi.status_last_updated_at IS NULL AND EXTRACT(days FROM now() - soi.created_at) > threshold_days)
    )
  ORDER BY days_in_status DESC, soi.created_at ASC;
END;
$function$;

-- Create audit table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_table_name text DEFAULT NULL,
  p_record_id text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, old_values, new_values
  ) VALUES (
    auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values
  );
END;
$$;