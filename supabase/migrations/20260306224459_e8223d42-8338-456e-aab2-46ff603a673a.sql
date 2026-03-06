
-- Step 1: Delete the 3 broken TPU ranges at 4432+
DELETE FROM serial_range_directory 
WHERE id IN (
  '94c94afe-2099-45ca-92ac-95e6e5e98796',
  'c4a9b1b8-68f7-41b0-b14f-4a76cf5755f1',
  '08941348-e94d-4ec6-a0ae-d8cee5af77cf'
);

-- Step 2: Replace get_next_serial_number — remove Step 3 extension logic
CREATE OR REPLACE FUNCTION public.get_next_serial_number(p_user_id UUID, p_item_title TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_serial INTEGER;
  v_serial_str TEXT;
  v_is_duplicate BOOLEAN;
  v_is_in_additional BOOLEAN;
  v_counter INTEGER;
  v_category TEXT;
  v_brand TEXT;
  v_range_start INTEGER;
  v_range_end INTEGER;
  v_range_id UUID;
  v_max_serial INTEGER;
  v_in_reserved_range BOOLEAN;
  v_lower_title TEXT;
  v_cat_range RECORD;
BEGIN
  -- Initialize counter if it doesn't exist
  INSERT INTO serial_number_counter (user_id, next_serial)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- If title provided, try category-aware assignment
  IF p_item_title IS NOT NULL AND p_item_title != '' THEN
    v_lower_title := lower(p_item_title);
    v_category := NULL;
    v_brand := 'Other';
    
    -- Category detection
    IF v_lower_title ~ '(tempered glass|screen protector|glass protector|privacy glass|matte glass|ceramic glass)' THEN
      v_category := 'Screen Protector';
    ELSIF v_lower_title ~ '(tpu|carbon fiber|carbon fibre|brushed case|rugged armor)' THEN
      v_category := 'TPU / Carbon Fiber Case';
    ELSIF v_lower_title ~ '(silicone case|silicone phone|soft case|jelly case|gel case)' THEN
      v_category := 'Silicone Case';
    ELSIF v_lower_title ~ '(leather case|flip case|flip cover|wallet case|book case|folio)' THEN
      v_category := 'Leather / Flip Case';
    ELSIF v_lower_title ~ '(shockproof|rugged|armor case|heavy duty|military|kickstand case|ring holder case)' THEN
      v_category := 'Shockproof / Rugged Case';
    ELSIF v_lower_title ~ '(clear case|transparent case|crystal case|see through)' THEN
      v_category := 'Clear / Transparent Case';
    ELSIF v_lower_title ~ '(remote|ir remote|tv remote|ac remote|air conditioner remote|air condition)' THEN
      v_category := 'Remote Control';
    ELSIF v_lower_title ~ '(watch band|watch strap|smartwatch band|wrist band|wristband)' THEN
      v_category := 'Watch Band / Strap';
    ELSIF v_lower_title ~ '(cable|charger|adapter|charging|usb|type-c|type c|lightning cable|power bank|wireless charger)' THEN
      v_category := 'Cable & Charger';
    ELSIF v_lower_title ~ '(earphone|headphone|earbuds|headset|speaker|airpods|buds case)' THEN
      v_category := 'Audio Accessory';
    ELSIF v_lower_title ~ '(tablet case|ipad case|tab case|tablet cover|ipad cover|smart cover)' THEN
      v_category := 'Tablet Case / Cover';
    ELSIF v_lower_title ~ '(hdmi|converter|hub|splitter|switch|extender|dongle|otg)' THEN
      v_category := 'Electronics Accessory';
    ELSIF v_lower_title ~ '(camera|lens|tripod|selfie|ring light|gimbal)' THEN
      v_category := 'Camera / Lens';
    ELSIF v_lower_title ~ '(car mount|car holder|car charger|phone holder car|dashboard)' THEN
      v_category := 'Car Accessory';
    END IF;

    -- Brand detection
    IF v_category IS NOT NULL THEN
      IF v_lower_title ~ '(samsung|galaxy)' THEN
        v_brand := 'Samsung';
      ELSIF v_lower_title ~ '(iphone|apple|ipad|airpods|macbook)' THEN
        v_brand := 'iPhone / Apple';
      ELSIF v_lower_title ~ '(xiaomi|redmi|poco|mi )' THEN
        v_brand := 'Xiaomi';
      ELSIF v_lower_title ~ '(oppo|realme)' THEN
        v_brand := 'OPPO';
      ELSIF v_lower_title ~ '(huawei|honor)' THEN
        v_brand := 'Huawei';
      ELSIF v_lower_title ~ '(oneplus|one plus)' THEN
        v_brand := 'OnePlus';
      ELSIF v_lower_title ~ '(vivo)' THEN
        v_brand := 'Vivo';
      ELSIF v_lower_title ~ '(nokia)' THEN
        v_brand := 'Nokia';
      ELSIF v_lower_title ~ '(motorola|moto )' THEN
        v_brand := 'Motorola';
      ELSIF v_lower_title ~ '(google|pixel)' THEN
        v_brand := 'Google';
      ELSIF v_lower_title ~ '(sony|xperia)' THEN
        v_brand := 'Sony';
      ELSIF v_lower_title ~ '(lg )' THEN
        v_brand := 'LG';
      ELSIF v_lower_title ~ '(tecno)' THEN
        v_brand := 'Tecno';
      ELSIF v_lower_title ~ '(infinix)' THEN
        v_brand := 'Infinix';
      ELSIF v_lower_title ~ '(tcl)' THEN
        v_brand := 'TCL';
      ELSIF v_lower_title ~ '(nothing phone|nothing cmf)' THEN
        v_brand := 'Nothing';
      END IF;

      -- STEP 1: Try the exact brand range first
      SELECT id, range_start, range_end, items_used
      INTO v_range_id, v_range_start, v_range_end, v_counter
      FROM serial_range_directory
      WHERE user_id = p_user_id AND category = v_category AND brand = v_brand
      FOR UPDATE;

      IF v_range_id IS NOT NULL THEN
        FOR v_next_serial IN v_range_start..v_range_end LOOP
          v_serial_str := LPAD(v_next_serial::TEXT, 5, '0');
          
          SELECT EXISTS(
            SELECT 1 FROM asin_inventory 
            WHERE user_id = p_user_id AND serial_number = v_serial_str
          ) INTO v_is_duplicate;
          
          IF NOT v_is_duplicate THEN
            SELECT EXISTS(
              SELECT 1 FROM asin_inventory
              WHERE user_id = p_user_id AND v_serial_str = ANY(additional_serial_numbers)
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
      END IF;

      -- STEP 2: Brand range full or not found — scan ALL ranges in this category for gaps
      FOR v_cat_range IN
        SELECT id, range_start, range_end
        FROM serial_range_directory
        WHERE user_id = p_user_id AND category = v_category
        ORDER BY range_start
      LOOP
        FOR v_next_serial IN v_cat_range.range_start..v_cat_range.range_end LOOP
          v_serial_str := LPAD(v_next_serial::TEXT, 5, '0');
          
          SELECT EXISTS(
            SELECT 1 FROM asin_inventory 
            WHERE user_id = p_user_id AND serial_number = v_serial_str
          ) INTO v_is_duplicate;
          
          IF NOT v_is_duplicate THEN
            SELECT EXISTS(
              SELECT 1 FROM asin_inventory
              WHERE user_id = p_user_id AND v_serial_str = ANY(additional_serial_numbers)
            ) INTO v_is_in_additional;
          ELSE
            v_is_in_additional := FALSE;
          END IF;
          
          IF NOT v_is_duplicate AND NOT v_is_in_additional THEN
            UPDATE serial_range_directory
            SET items_used = items_used + 1, updated_at = now()
            WHERE id = v_cat_range.id;
            RETURN v_serial_str;
          END IF;
        END LOOP;
      END LOOP;

      -- STEP 3 REMOVED: No more extension blocks.
      -- If entire category is full, fall through to global fallback below.
    END IF;
  END IF;

  -- Fallback: global gap-filling logic (skip category-reserved ranges)
  SELECT next_serial INTO v_counter
  FROM serial_number_counter
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  FOR v_next_serial IN 1..(v_counter - 1) LOOP
    v_serial_str := LPAD(v_next_serial::TEXT, 5, '0');
    
    SELECT EXISTS(
      SELECT 1 FROM serial_range_directory
      WHERE user_id = p_user_id
      AND v_next_serial BETWEEN range_start AND range_end
    ) INTO v_in_reserved_range;
    
    IF v_in_reserved_range THEN
      CONTINUE;
    END IF;
    
    SELECT EXISTS(
      SELECT 1 FROM asin_inventory 
      WHERE user_id = p_user_id AND serial_number = v_serial_str
    ) INTO v_is_duplicate;
    
    IF NOT v_is_duplicate THEN
      SELECT EXISTS(
        SELECT 1 FROM asin_inventory
        WHERE user_id = p_user_id AND v_serial_str = ANY(additional_serial_numbers)
      ) INTO v_is_in_additional;
    ELSE
      v_is_in_additional := FALSE;
    END IF;
    
    IF NOT v_is_duplicate AND NOT v_is_in_additional THEN
      RETURN v_serial_str;
    END IF;
  END LOOP;
  
  LOOP
    v_serial_str := LPAD(v_counter::TEXT, 5, '0');
    
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
      WHERE user_id = p_user_id AND serial_number = v_serial_str
    ) INTO v_is_duplicate;
    
    IF NOT v_is_duplicate THEN
      SELECT EXISTS(
        SELECT 1 FROM asin_inventory
        WHERE user_id = p_user_id AND v_serial_str = ANY(additional_serial_numbers)
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
$$;
