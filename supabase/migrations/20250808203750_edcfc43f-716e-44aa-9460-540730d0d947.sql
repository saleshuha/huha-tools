-- Remove all sunsky_skus records that don't have titles
DELETE FROM public.sunsky_skus 
WHERE title IS NULL 
  AND user_id = '6e460bc4-1c7e-4bf9-a911-6dc5d96228c1';