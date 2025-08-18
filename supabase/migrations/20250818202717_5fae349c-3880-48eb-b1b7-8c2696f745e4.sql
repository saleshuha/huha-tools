-- Insert vendor integration with Amazon-provided SFTP details
INSERT INTO public.vendor_integrations (
  user_id,
  vendor_name,
  transport_method,
  sftp_host,
  sftp_port,
  sftp_username,
  sftp_remote_path,
  country,
  primary_key_type,
  feed_schedule,
  is_active
) VALUES (
  '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1', -- Your user ID
  'Amazon Vendor Central - Production',
  'SFTP',
  'eu-sftp.amazonsedi.com',
  22,
  '18DL8XNNYWXN1', -- Sending username (for uploading inventory feeds)
  'upload',
  'UAE',
  'SKU',
  'daily',
  true
);

-- Insert vendor item mapping example for testing
INSERT INTO public.vendor_item_mappings (
  user_id,
  integration_id,
  internal_sku,
  internal_asin,
  vendor_sku,
  vendor_asin,
  upc,
  country,
  is_active
) VALUES (
  '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1',
  (SELECT id FROM public.vendor_integrations WHERE user_id = '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1' AND vendor_name = 'Amazon Vendor Central - Production'),
  'TEST-SKU-001',
  'B07XYZ123',
  'VENDOR-SKU-001',
  'B07ABC456',
  '123456789012',
  'UAE',
  true
);