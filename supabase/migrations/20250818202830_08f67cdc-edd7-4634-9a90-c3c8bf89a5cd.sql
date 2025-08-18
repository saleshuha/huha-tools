-- Update the primary key type to ASIN for the Amazon integration
UPDATE public.vendor_integrations 
SET primary_key_type = 'ASIN'
WHERE user_id = '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1' 
AND vendor_name = 'Amazon Vendor Central - Production';