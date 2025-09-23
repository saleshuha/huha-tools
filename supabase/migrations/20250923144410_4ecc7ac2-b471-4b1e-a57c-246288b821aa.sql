-- Remove duplicate entries from product_images table, keeping only the most recent one
DELETE FROM product_images 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY user_id, asin 
             ORDER BY created_at DESC
           ) as row_num
    FROM product_images
  ) ranked
  WHERE row_num > 1
);

-- Create a unique constraint to prevent future duplicates
ALTER TABLE product_images 
ADD CONSTRAINT unique_user_asin UNIQUE (user_id, asin);