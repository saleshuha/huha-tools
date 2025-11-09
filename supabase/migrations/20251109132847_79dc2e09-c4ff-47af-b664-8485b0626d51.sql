-- Consolidate duplicate ASIN inventory records for B0DYG71T36
-- This migration finds all duplicate in-stock records for B0DYG71T36,
-- sums their quantities, updates the oldest record, and deletes duplicates

DO $$
DECLARE
  v_user_id uuid;
  v_total_qty integer;
  v_oldest_id uuid;
  v_deleted_count integer;
BEGIN
  -- Process for each user that has duplicate B0DYG71T36 records
  FOR v_user_id IN 
    SELECT DISTINCT user_id 
    FROM asin_inventory 
    WHERE asin = 'B0DYG71T36' 
      AND status = 'in-stock'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    -- Calculate total quantity for this user
    SELECT SUM(quantity) INTO v_total_qty
    FROM asin_inventory
    WHERE asin = 'B0DYG71T36' 
      AND status = 'in-stock'
      AND user_id = v_user_id;
    
    -- Get the oldest record ID to keep
    SELECT id INTO v_oldest_id
    FROM asin_inventory
    WHERE asin = 'B0DYG71T36' 
      AND status = 'in-stock'
      AND user_id = v_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Update the oldest record with the total quantity
    UPDATE asin_inventory
    SET 
      quantity = v_total_qty,
      updated_at = now(),
      notes = COALESCE(notes, '') || ' [Consolidated duplicate records on ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ']'
    WHERE id = v_oldest_id;
    
    -- Delete all other duplicate records for this user
    DELETE FROM asin_inventory
    WHERE asin = 'B0DYG71T36' 
      AND status = 'in-stock'
      AND user_id = v_user_id
      AND id != v_oldest_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'User %: Consolidated % duplicates into record %. Total quantity: %', 
      v_user_id, v_deleted_count, v_oldest_id, v_total_qty;
  END LOOP;
END $$;