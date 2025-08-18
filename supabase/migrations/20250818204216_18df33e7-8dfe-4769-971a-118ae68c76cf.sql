-- Add SFTP receiving configuration fields to vendor_integrations table
ALTER TABLE public.vendor_integrations 
ADD COLUMN sftp_receive_host TEXT,
ADD COLUMN sftp_receive_username TEXT,
ADD COLUMN sftp_receive_remote_path TEXT,
ADD COLUMN sftp_receive_port INTEGER DEFAULT 22,
ADD COLUMN ssh_fingerprint_sending TEXT,
ADD COLUMN ssh_fingerprint_receiving TEXT;

-- Update existing records with default receiving values
UPDATE public.vendor_integrations 
SET 
  sftp_receive_host = 'eu-sftp.amazonsedi.com',
  sftp_receive_username = '39ZYAQGPS10UV',
  sftp_receive_remote_path = 'download',
  sftp_receive_port = 22;

-- Add comments for clarity
COMMENT ON COLUMN public.vendor_integrations.sftp_host IS 'SFTP host for sending files to vendor';
COMMENT ON COLUMN public.vendor_integrations.sftp_username IS 'SFTP username for sending files to vendor';
COMMENT ON COLUMN public.vendor_integrations.sftp_remote_path IS 'SFTP remote path for sending files to vendor';
COMMENT ON COLUMN public.vendor_integrations.sftp_receive_host IS 'SFTP host for receiving files from vendor';
COMMENT ON COLUMN public.vendor_integrations.sftp_receive_username IS 'SFTP username for receiving files from vendor';
COMMENT ON COLUMN public.vendor_integrations.sftp_receive_remote_path IS 'SFTP remote path for receiving files from vendor';
COMMENT ON COLUMN public.vendor_integrations.ssh_fingerprint_sending IS 'MD5 fingerprint of SSH public key for sending';
COMMENT ON COLUMN public.vendor_integrations.ssh_fingerprint_receiving IS 'MD5 fingerprint of SSH public key for receiving';