-- Update the vendor integration from UAE to KSA
UPDATE public.vendor_integrations 
SET country = 'KSA'
WHERE user_id = '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1' 
AND vendor_name = 'Amazon Vendor Central - Production';

-- Update all ASIN inventory from UAE to KSA for this user
UPDATE public.asin_inventory 
SET country = 'KSA'
WHERE user_id = '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1' 
AND country = 'UAE';

-- Update vendor item mappings from UAE to KSA
UPDATE public.vendor_item_mappings 
SET country = 'KSA'
WHERE user_id = '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1' 
AND country = 'UAE';