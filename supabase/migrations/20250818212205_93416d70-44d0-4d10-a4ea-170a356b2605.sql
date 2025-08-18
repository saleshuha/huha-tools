-- Update the existing integration with the correct receiving credentials
UPDATE vendor_integrations 
SET 
  sftp_receive_host = 'eu-sftp.amazonsedi.com',
  sftp_receive_port = 22,
  sftp_receive_username = '39ZYAQGPS10UV',
  sftp_receive_remote_path = 'download',
  ssh_fingerprint_receiving = '3d9738f4f7e472c532147bd85145f69c',
  updated_at = now()
WHERE vendor_name = 'ZUS1I_SFTP_AMZN_20250818T191855020'
  AND country = 'KSA';