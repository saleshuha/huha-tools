-- Update the atomic serial number generator to fill gaps first
CREATE OR REPLACE FUNCTION get_next_serial_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_serial INTEGER;
  v_serial_str TEXT;
  v_is_duplicate BOOLEAN;
  v_counter INTEGER;
BEGIN
  -- Initialize counter if it doesn't exist
  INSERT INTO serial_number_counter (user_id, next_serial)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current counter value
  SELECT next_serial INTO v_counter
  FROM serial_number_counter
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock the row
  
  -- Strategy 1: Look for gaps from 1 to (counter - 1)
  -- This ensures we fill missing serial numbers first
  FOR v_next_serial IN 1..(v_counter - 1) LOOP
    v_serial_str := LPAD(v_next_serial::TEXT, 5, '0');
    
    -- Check if this serial exists
    SELECT EXISTS(
      SELECT 1 FROM asin_inventory 
      WHERE user_id = p_user_id 
      AND serial_number = v_serial_str
    ) INTO v_is_duplicate;
    
    -- Found a gap! Return it without incrementing counter
    IF NOT v_is_duplicate THEN
      RETURN v_serial_str;
    END IF;
  END LOOP;
  
  -- Strategy 2: No gaps found, use counter and increment
  LOOP
    v_serial_str := LPAD(v_counter::TEXT, 5, '0');
    
    -- Check if this serial already exists (edge case protection)
    SELECT EXISTS(
      SELECT 1 FROM asin_inventory 
      WHERE user_id = p_user_id 
      AND serial_number = v_serial_str
    ) INTO v_is_duplicate;
    
    -- If not duplicate, increment counter and return
    IF NOT v_is_duplicate THEN
      UPDATE serial_number_counter
      SET next_serial = v_counter + 1,
          updated_at = now()
      WHERE user_id = p_user_id;
      
      RETURN v_serial_str;
    END IF;
    
    -- If duplicate exists (edge case), increment and try next
    v_counter := v_counter + 1;
  END LOOP;
END;
$$;