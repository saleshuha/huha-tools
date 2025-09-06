-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns to sunsky_credentials table
ALTER TABLE public.sunsky_credentials 
ADD COLUMN IF NOT EXISTS api_key_encrypted bytea,
ADD COLUMN IF NOT EXISTS api_secret_encrypted bytea,
ADD COLUMN IF NOT EXISTS key_last4 text;

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

-- Create secure view that only exposes safe data
CREATE OR REPLACE VIEW public.sunsky_credentials_secure AS
SELECT 
  id,
  user_id,
  name,
  is_active,
  last_tested,
  created_at,
  updated_at,
  key_last4
FROM public.sunsky_credentials;

-- Update RLS policies for sunsky_credentials
-- Users can only read from the secure view, not the base table directly
DROP POLICY IF EXISTS "Users can view their own Sunsky credentials" ON public.sunsky_credentials;
DROP POLICY IF EXISTS "Users can create their own Sunsky credentials" ON public.sunsky_credentials;
DROP POLICY IF EXISTS "Users can update their own Sunsky credentials" ON public.sunsky_credentials;
DROP POLICY IF EXISTS "Users can delete their own Sunsky credentials" ON public.sunsky_credentials;

-- Base table policies - restrict direct access for users
CREATE POLICY "Admin and system can access sunsky credentials"
ON public.sunsky_credentials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Secure view policies - users can read their own data from secure view
CREATE POLICY "Users can view their own credentials from secure view"
ON public.sunsky_credentials_secure
FOR SELECT
USING (auth.uid() = user_id);

-- Enable RLS on the secure view
ALTER VIEW public.sunsky_credentials_secure SET (security_invoker = true);

-- Fix exchange_rates RLS - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON public.exchange_rates;
CREATE POLICY "Authenticated users can view exchange rates"
ON public.exchange_rates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Check if payment_terms table exists and fix RLS if it does
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_terms' AND table_schema = 'public') THEN
    -- Drop existing public policy if it exists
    DROP POLICY IF EXISTS "Anyone can view payment terms" ON public.payment_terms;
    
    -- Create new authenticated-only policy
    CREATE POLICY "Authenticated users can view payment terms"
    ON public.payment_terms
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Fix SECURITY DEFINER functions that are missing SET search_path
-- Fix get_sunsky_slow_items function
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
    -- Exclude only shipped (5) and delivered (6) statuses
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

-- Trigger for profiles table changes (role/admin changes)
CREATE OR REPLACE FUNCTION public.audit_profiles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log role or admin status changes
    IF OLD.role IS DISTINCT FROM NEW.role OR OLD.is_main_admin IS DISTINCT FROM NEW.is_main_admin THEN
      PERFORM log_security_event(
        'profile_security_change',
        'profiles',
        NEW.id::text,
        jsonb_build_object('role', OLD.role, 'is_main_admin', OLD.is_main_admin),
        jsonb_build_object('role', NEW.role, 'is_main_admin', NEW.is_main_admin)
      );
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for profiles changes
DROP TRIGGER IF EXISTS audit_profiles_security_changes ON public.profiles;
CREATE TRIGGER audit_profiles_security_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profiles_changes();