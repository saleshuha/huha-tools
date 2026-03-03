CREATE OR REPLACE FUNCTION trigger_shopify_auto_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _config RECORD;
  _supabase_url TEXT := 'https://vfqqlifvhooefxvvyebm.supabase.co';
  _anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM';
  _trigger_secret TEXT := 'shopify-auto-sync-trigger-vfqqlifvhooefxvvyebm';
  _payload TEXT;
BEGIN
  IF NEW.quantity IS NOT DISTINCT FROM OLD.quantity THEN
    RETURN NEW;
  END IF;

  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _config
  FROM shopify_config
  WHERE user_id = NEW.user_id
    AND sync_enabled = true
    AND client_id IS NOT NULL
    AND client_secret IS NOT NULL
    AND location_id IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
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

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/shopify-sync?action=sync',
    body := _payload::jsonb,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key,
      'x-trigger-secret', _trigger_secret
    )::jsonb
  );

  RETURN NEW;
END;
$$;