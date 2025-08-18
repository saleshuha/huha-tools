-- Add some ASIN inventory data for testing the integration
INSERT INTO public.asin_inventory (
  user_id,
  asin,
  serial_number,
  quantity,
  status,
  country,
  date_added
) VALUES 
(
  '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1',
  'B07XYZ12345',
  'SN-001',
  25,
  'in-stock',
  'UAE',
  now()
),
(
  '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1',
  'B08ABC67890',
  'SN-002',
  50,
  'in-stock',
  'UAE',
  now()
),
(
  '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1',
  'B09DEF11111',
  'SN-003',
  10,
  'in-stock',
  'UAE',
  now()
) ON CONFLICT (user_id, asin, serial_number) DO NOTHING;