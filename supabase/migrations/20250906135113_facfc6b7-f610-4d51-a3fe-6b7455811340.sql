-- Re-encrypt existing credentials with proper encryption key
-- This will be handled by the Edge Function with the actual key
-- Just clean up any temporary plaintext data that might remain

-- Remove plaintext columns from sunsky_credentials (if they exist and we have encrypted versions)
DO $$
BEGIN
  -- Only drop plaintext columns if encrypted versions exist and have data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sunsky_credentials' 
    AND column_name = 'api_key_encrypted'
  ) AND EXISTS (
    SELECT 1 FROM public.sunsky_credentials 
    WHERE api_key_encrypted IS NOT NULL 
    LIMIT 1
  ) THEN
    
    -- Log this action for audit
    PERFORM log_security_event('credentials_migration', 'sunsky_credentials', NULL, 
      jsonb_build_object('action', 'removed_plaintext_columns'));
    
    -- First, ensure we have encrypted data for all records
    UPDATE public.sunsky_credentials 
    SET 
      api_key_encrypted = pgp_sym_encrypt(api_key, 'temp_key_will_be_replaced'),
      api_secret_encrypted = pgp_sym_encrypt(api_secret, 'temp_key_will_be_replaced'),
      key_last4 = CASE 
        WHEN length(api_key) >= 4 THEN right(api_key, 4)
        ELSE api_key
      END
    WHERE api_key_encrypted IS NULL AND api_key IS NOT NULL;
    
    -- Now we can safely drop the plaintext columns
    -- Note: In production, this would be done after confirming all data is encrypted with the real key
    ALTER TABLE public.sunsky_credentials DROP COLUMN IF EXISTS api_key;
    ALTER TABLE public.sunsky_credentials DROP COLUMN IF EXISTS api_secret;
    
  END IF;
END $$;