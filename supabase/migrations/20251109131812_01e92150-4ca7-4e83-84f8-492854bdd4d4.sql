-- Update existing inventory records to have country from user profile
UPDATE asin_inventory
SET country = COALESCE(
  (SELECT country FROM profiles WHERE profiles.id = asin_inventory.user_id),
  'KSA'
)
WHERE country IS NULL;