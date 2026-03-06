
CREATE OR REPLACE FUNCTION public.get_next_serial_number(p_user_id uuid, p_item_title text DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_next_serial INTEGER;
  v_serial_str TEXT;
  v_is_duplicate BOOLEAN;
  v_is_in_additional BOOLEAN;
  v_counter INTEGER;
  v_category TEXT;
  v_range_start INTEGER;
  v_range_end INTEGER;
  v_range_id UUID;
  v_max_serial INTEGER;
  v_in_reserved_range BOOLEAN;
BEGIN
  -- Initialize counter if it doesn't exist
  INSERT INTO serial_number_counter (user_id, next_serial)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- If title provided, try category-aware assignment
  IF p_item_title IS NOT NULL AND p_item_title != '' THEN
    v_category := NULL;
    
    IF lower(p_item_title) ~ '(tempered glass|screen protector|glass protector|privacy glass|matte glass|ceramic glass)' THEN
      v_category := 'Screen Protector';
    ELSIF lower(p_item_title) ~ '(tpu|carbon fiber|carbon fibre|brushed case|rugged armor)' THEN
      v_category := 'TPU / Carbon Fiber Case';
    ELSIF lower(p_item_title) ~ '(silicone case|silicone phone|soft case|jelly case|gel case)' THEN
      v_category := 'Silicone Case';
    ELSIF lower(p_item_title) ~ '(leather case|flip case|flip cover|wallet case|book case|folio)' THEN
      v_category := 'Leather / Flip Case';
    ELSIF lower(p_item_title) ~ '(shockproof|rugged|armor case|heavy duty|military|kickstand case|ring holder case)' THEN
      v_category := 'Shockproof / Rugged Case';
    ELSIF lower(p_item_title) ~ '(clear case|transparent case|crystal case|see through)' THEN
      v_category := 'Clear / Transparent Case';
    ELSIF lower(p_item_title) ~ '(remote|ir remote|tv remote|ac remote|air conditioner remote|air condition)' THEN
      v_category := 'Remote Control';
    ELSIF lower(p_item_title) ~ '(watch band|watch strap|smartwatch band|wrist band|wristband)' THEN
      v_category := 'Watch Band / Strap';
    ELSIF lower(p_item_title) ~ '(cable|charger|adapter|charging|usb|type-c|type c|lightning cable|power bank|wireless charger)' THEN
      v_category := 'Cable & Charger';
    ELSIF lower(p_item_title) ~ '(earphone|headphone|earbuds|headset|speaker|airpods|buds case)' THEN
      v_category := 'Audio Accessory';
    ELSIF lower(p_item_title) ~ '(tablet case|ipad case|tab case|tablet cover|ipad cover|smart cover)' THEN
      v_category := 'Tablet Case / Cover';
    ELSIF lower(p_item_title) ~ '(hdmi|converter|hub|splitter|switch|extender|dongle|otg)' THEN
      v_category := 'Electronics Accessory';
    ELSIF lower(p_item_title) ~ '(camera|lens|tripod|selfie|ring light|gimbal)' THEN
      v_category := 'Camera / Lens';
    ELSIF lower(p_item_title) ~ '(car mount|car holder|car charger|phone holder car|dashboard)' THEN
      v_category := 'Car Accessory';
    END IF;

    -- If category detected, look up range directory
    IF v_category IS NOT NULL THEN
      SELECT id, range_start, range_end, items_used
      INTO v_range_id, v_range_start, v_range_end, v_counter
      FROM serial_range_directory
      WHERE user_id = p_user_id AND category = v_category
      FOR UPDATE;

      IF v_range_id IS NOT NULL THEN
        -- Try to find next available serial within this range
        FOR v_next_serial IN v_range_start..v_range_end LOOP
          v_serial_str := LPAD(v_next_serial::TEXT, 5, '0');
          
          -- Check primary serial_number
          SELECT EXISTS(
            SELECT 1 FROM asin_inventory 
            WHERE user_id = p_user_id 
            AND serial_number = v_serial_str
          ) INTO v_is_duplicate;
          
          -- Check additional_serial_numbers array
          IF NOT v_is_duplicate THEN
            SELECT EXISTS(
              SELECT 1 FROM asin_inventory
              WHERE user_id = p_user_id
              AND v_serial_str = ANY(additional_serial_numbers)
            ) INTO v_is_in_additional;
          ELSE
            v_is_in_additional := FALSE;
          END IF;
          
          IF NOT v_is_duplicate AND NOT v_is_in_additional THEN
            UPDATE serial_range_directory
            SET items_used = items_used + 1, updated_at = now()
            WHERE id = v_range_id;
            
            RETURN v_serial_str;
          END IF;
        END LOOP;

        -- Range is full - extend it
        SELECT next_serial INTO v_counter
        FROM serial_number_counter
        WHERE user_id = p_user_id
        FOR UPDATE;

        SELECT COALESCE(MAX(serial_number::integer), 0) INTO v_max_serial
        FROM asin_inventory
        WHERE user_id = p_user_id AND serial_number ~ '^\d{5}$';

        v_range_start := GREATEST(v_counter, v_max_serial + 1);
        v_range_end := v_range_start + 24;

        UPDATE serial_range_directory
        SET range_start = v_range_start,
            range_end = v_range_end,
            items_used = 1,
            updated_at = now()
        WHERE id = v_range_id;

        UPDATE serial_number_counter
        SET next_serial = v_range_end + 1, updated_at = now()
        WHERE user_id = p_user_id;

        RETURN LPAD(v_range_start::TEXT, 5, '0');
      END IF;
    END IF;
  END IF;

  -- Fallback: global gap-filling logic (skip category-reserved ranges)
  SELECT next_serial INTO v_counter
  FROM serial_number_counter
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Strategy 1: Look for gaps, but skip serials inside category-reserved ranges
  FOR v_next_serial IN 1..(v_counter - 1) LOOP
    v_serial_str := LPAD(v_next_serial::TEXT, 5, '0');
    
    -- Check if this serial falls within any reserved category range
    SELECT EXISTS(
      SELECT 1 FROM serial_range_directory
      WHERE user_id = p_user_id
      AND v_next_serial BETWEEN range_start AND range_end
    ) INTO v_in_reserved_range;
    
    -- Skip serials that belong to a category range
    IF v_in_reserved_range THEN
      CONTINUE;
    END IF;
    
    -- Check primary serial
    SELECT EXISTS(
      SELECT 1 FROM asin_inventory 
      WHERE user_id = p_user_id 
      AND serial_number = v_serial_str
    ) INTO v_is_duplicate;
    
    -- Check additional_serial_numbers
    IF NOT v_is_duplicate THEN
      SELECT EXISTS(
        SELECT 1 FROM asin_inventory
        WHERE user_id = p_user_id
        AND v_serial_str = ANY(additional_serial_numbers)
      ) INTO v_is_in_additional;
    ELSE
      v_is_in_additional := FALSE;
    END IF;
    
    IF NOT v_is_duplicate AND NOT v_is_in_additional THEN
      RETURN v_serial_str;
    END IF;
  END LOOP;
  
  -- Strategy 2: Use counter and increment
  LOOP
    v_serial_str := LPAD(v_counter::TEXT, 5, '0');
    
    -- Check if in reserved range
    SELECT EXISTS(
      SELECT 1 FROM serial_range_directory
      WHERE user_id = p_user_id
      AND v_counter BETWEEN range_start AND range_end
    ) INTO v_in_reserved_range;
    
    IF v_in_reserved_range THEN
      v_counter := v_counter + 1;
      CONTINUE;
    END IF;
    
    SELECT EXISTS(
      SELECT 1 FROM asin_inventory 
      WHERE user_id = p_user_id 
      AND serial_number = v_serial_str
    ) INTO v_is_duplicate;
    
    IF NOT v_is_duplicate THEN
      SELECT EXISTS(
        SELECT 1 FROM asin_inventory
        WHERE user_id = p_user_id
        AND v_serial_str = ANY(additional_serial_numbers)
      ) INTO v_is_in_additional;
    ELSE
      v_is_in_additional := FALSE;
    END IF;
    
    IF NOT v_is_duplicate AND NOT v_is_in_additional THEN
      UPDATE serial_number_counter
      SET next_serial = v_counter + 1, updated_at = now()
      WHERE user_id = p_user_id;
      
      RETURN v_serial_str;
    END IF;
    
    v_counter := v_counter + 1;
  END LOOP;
END;
$function$;
