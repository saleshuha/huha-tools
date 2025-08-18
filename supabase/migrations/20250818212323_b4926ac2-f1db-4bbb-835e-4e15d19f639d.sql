-- Update the existing integration with the correct sending credentials
UPDATE vendor_integrations 
SET 
  sftp_host = 'eu-sftp.amazonsedi.com',
  sftp_port = 22,
  sftp_username = '18DL8XNNYWXN1',
  sftp_remote_path = 'upload',
  ssh_fingerprint_sending = '3d9738f4f7e472c532147bd85145f69c',
  updated_at = now()
WHERE vendor_name = 'ZUS1I_SFTP_AMZN_20250818T191855020'
  AND country = 'KSA';