
-- Enable pg_net extension for HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the trigger function for auto-syncing inventory to Shopify
CREATE OR REPLACE FUNCTION public.trigger_shopify_auto_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _config RECORD;
  _supabase_url TEXT;
  _service_role_key TEXT;
  _payload TEXT;
BEGIN
  -- Only proceed if quantity actually changed
  IF NEW.quantity IS NOT DISTINCT FROM OLD.quantity THEN
    RETURN NEW;
  END IF;

  -- Skip if no SKU
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    RETURN NEW;
  END IF;

  -- Look up user's shopify_config
  SELECT * INTO _config
  FROM shopify_config
  WHERE user_id = NEW.user_id
    AND sync_enabled = true
    AND client_id IS NOT NULL
    AND client_secret IS NOT NULL
    AND location_id IS NOT NULL
  LIMIT 1;

  -- No active config, skip
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key from vault/env
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, try env vars
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    SELECT decrypted_secret INTO _supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url'
    LIMIT 1;
  END IF;

  IF _service_role_key IS NULL OR _service_role_key = '' THEN
    SELECT decrypted_secret INTO _service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  END IF;

  -- Fallback: use the known project URL
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    _supabase_url := 'https://vfqqlifvhooefxvvyebm.supabase.co';
  END IF;

  -- If we still don't have a service role key, we can't call the function
  IF _service_role_key IS NULL OR _service_role_key = '' THEN
    RETURN NEW;
  END IF;

  _payload := json_build_object(
    'items', json_build_array(
      json_build_object(
        'sku', NEW.sku,
        'title', COALESCE(NEW.title, ''),
        'local_quantity', NEW.quantity
      )
    ),
    'user_id', NEW.user_id
  )::text;

  -- Fire async HTTP request to shopify-sync edge function
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/shopify-sync?action=sync',
    body := _payload::jsonb,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    )::jsonb
  );

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS shopify_auto_sync_trigger ON asin_inventory;
CREATE TRIGGER shopify_auto_sync_trigger
  AFTER UPDATE OF quantity ON asin_inventory
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION trigger_shopify_auto_sync();
