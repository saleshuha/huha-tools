-- More aggressive duplicate cleanup
-- This handles cases where the previous migration might have missed some

DO $$
DECLARE
  duplicate_record RECORD;
  new_serial TEXT;
  max_serial_num INTEGER;
BEGIN
  -- Loop through all duplicates and fix them one by one
  FOR duplicate_record IN 
    SELECT 
      user_id,
      serial_number,
      array_agg(id ORDER BY created_at) as ids
    FROM asin_inventory
    WHERE serial_number IS NOT NULL 
      AND serial_number != ''
    GROUP BY user_id, serial_number
    HAVING COUNT(*) > 1
  LOOP
    -- Get max serial for this user
    SELECT COALESCE(MAX(CAST(serial_number AS INTEGER)), 0)
    INTO max_serial_num
    FROM asin_inventory
    WHERE user_id = duplicate_record.user_id
      AND serial_number ~ '^\d{5}$';
    
    -- Update all but the first duplicate
    FOR i IN 2..array_length(duplicate_record.ids, 1) LOOP
      max_serial_num := max_serial_num + 1;
      new_serial := LPAD(max_serial_num::TEXT, 5, '0');
      
      UPDATE asin_inventory
      SET serial_number = new_serial
      WHERE id = duplicate_record.ids[i];
      
      RAISE NOTICE 'Updated duplicate % to %', duplicate_record.serial_number, new_serial;
    END LOOP;
  END LOOP;
END $$;