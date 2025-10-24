-- Step 1: Delete duplicate PO records, keeping only the oldest one for each po_key+item_key combination
-- This will clean up the duplicate records created by failed duplicate detection

DELETE FROM po_orders
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      po_key,
      item_key,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, po_key, item_key 
        ORDER BY created_at ASC  -- Keep the OLDEST record
      ) as rn
    FROM po_orders
  ) ranked
  WHERE rn > 1  -- Delete all but the first (oldest) record
);

-- Step 2: Create a unique constraint to prevent future duplicates
-- This will ensure the same po_key+item_key combination can't exist twice for a user

CREATE UNIQUE INDEX IF NOT EXISTS idx_po_orders_unique_item 
ON po_orders (user_id, po_key, item_key)
WHERE po_key IS NOT NULL AND item_key IS NOT NULL;

-- Step 3: Add a comment explaining the constraint
COMMENT ON INDEX idx_po_orders_unique_item IS 
'Ensures each PO item (identified by po_key+item_key) exists only once per user, preventing duplicate entries during file uploads';