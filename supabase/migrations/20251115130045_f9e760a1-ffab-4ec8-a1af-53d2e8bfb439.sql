-- Clean up duplicate serial numbers by auto-reassigning them
-- Keep the oldest item with each duplicate serial, reassign newer ones

DO $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Update duplicates with new serial numbers
  WITH duplicate_serials AS (
    SELECT 
      serial_number,
      user_id
    FROM asin_inventory
    WHERE serial_number IS NOT NULL 
      AND serial_number != ''
    GROUP BY user_id, serial_number
    HAVING COUNT(*) > 1
  ),
  items_to_update AS (
    SELECT 
      ai.id,
      ai.serial_number as old_serial,
      ai.user_id,
      ROW_NUMBER() OVER (PARTITION BY ai.user_id, ai.serial_number ORDER BY ai.created_at) as rn
    FROM asin_inventory ai
    INNER JOIN duplicate_serials ds 
      ON ai.user_id = ds.user_id 
      AND ai.serial_number = ds.serial_number
  ),
  max_serials AS (
    SELECT 
      user_id,
      COALESCE(MAX(CAST(serial_number AS INTEGER)), 0) as max_serial
    FROM asin_inventory
    WHERE serial_number ~ '^\d{5}$'
    GROUP BY user_id
  )
  UPDATE asin_inventory
  SET serial_number = LPAD((ms.max_serial + itu.rn)::TEXT, 5, '0')
  FROM items_to_update itu
  LEFT JOIN max_serials ms ON ms.user_id = itu.user_id
  WHERE asin_inventory.id = itu.id
    AND itu.rn > 1;

  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  RAISE NOTICE 'Fixed % duplicate serial numbers', fixed_count;
END $$;