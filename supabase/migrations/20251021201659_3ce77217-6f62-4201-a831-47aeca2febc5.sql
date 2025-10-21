-- Step 1: Clean up duplicate records in asin_inventory
-- Keep only the most recent record for each user_id + asin + serial_number combination
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, asin, serial_number 
           ORDER BY created_at DESC, date_added DESC
         ) as rn
  FROM asin_inventory
)
DELETE FROM asin_inventory
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE asin_inventory 
ADD CONSTRAINT unique_user_asin_serial 
UNIQUE (user_id, asin, serial_number);

-- Step 3: Clean up duplicate records in sku_inventory (preventive)
WITH sku_duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, sku_number, bin_serial_number 
           ORDER BY created_at DESC, date_added DESC
         ) as rn
  FROM sku_inventory
)
DELETE FROM sku_inventory
WHERE id IN (
  SELECT id FROM sku_duplicates WHERE rn > 1
);

-- Step 4: Add unique constraint to sku_inventory (preventive)
ALTER TABLE sku_inventory 
ADD CONSTRAINT unique_user_sku_bin 
UNIQUE (user_id, sku_number, bin_serial_number);