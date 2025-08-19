-- Add AS2 specific fields to vendor_integrations table
ALTER TABLE public.vendor_integrations 
ADD COLUMN as2_endpoint_url text,
ADD COLUMN as2_partner_id text,
ADD COLUMN as2_sender_id text,
ADD COLUMN as2_receiver_id text,
ADD COLUMN as2_certificate_path text,
ADD COLUMN as2_private_key_path text,
ADD COLUMN as2_encryption_algorithm text DEFAULT 'AES128',
ADD COLUMN as2_signature_algorithm text DEFAULT 'SHA256',
ADD COLUMN as2_compression boolean DEFAULT false,
ADD COLUMN as2_mdn_required boolean DEFAULT true,
ADD COLUMN as2_async_mdn boolean DEFAULT false,
ADD COLUMN as2_retry_count integer DEFAULT 3,
ADD COLUMN firewall_ip_ranges text[] DEFAULT ARRAY['54.217.255.192/29', '54.217.255.200/30', '54.217.255.204/31', '54.195.239.0/28', '34.253.190.128/26'];

-- Add comment explaining the firewall IP ranges
COMMENT ON COLUMN public.vendor_integrations.firewall_ip_ranges IS 'Amazon AS2 IP ranges that need to be whitelisted in firewall: 54.217.255.192/29, 54.217.255.200/30, 54.217.255.204/31, 54.195.239.0/28, 34.253.190.128/26';

-- Update the transport_method to support both SFTP and AS2
ALTER TABLE public.vendor_integrations 
DROP CONSTRAINT IF EXISTS vendor_integrations_transport_method_check;

ALTER TABLE public.vendor_integrations 
ADD CONSTRAINT vendor_integrations_transport_method_check 
CHECK (transport_method IN ('SFTP', 'AS2'));