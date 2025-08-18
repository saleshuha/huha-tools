-- Add ASIN inventory data for testing
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
  'AMZ-SN-001',
  25,
  'in-stock',
  'UAE',
  now()
),
(
  '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1',
  'B08ABC67890',
  'AMZ-SN-002',
  50,
  'in-stock',
  'UAE',
  now()
),
(
  '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1',
  'B09DEF11111',
  'AMZ-SN-003',
  10,
  'in-stock',
  'UAE',
  now()
);