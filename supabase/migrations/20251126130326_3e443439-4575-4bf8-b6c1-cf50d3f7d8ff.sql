-- Fix get_next_serial_numbers_batch to fill gaps first before incrementing counter
CREATE OR REPLACE FUNCTION public.get_next_serial_numbers_batch(
  p_user_id UUID,
  p_count INTEGER
) RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serials TEXT[] := '{}';
  v_counter INTEGER;
  v_serial_str TEXT;
  v_needed INTEGER := p_count;
  v_check_serial INTEGER;
  v_exists BOOLEAN;
BEGIN
  -- Get current counter with lock
  SELECT next_serial INTO v_counter
  FROM public.serial_number_counter
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_counter IS NULL THEN
    INSERT INTO public.serial_number_counter (user_id, next_serial)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id) DO NOTHING;
    v_counter := 1;
  END IF;

  -- STRATEGY 1: Fill gaps first (check from 1 to counter-1)
  FOR v_check_serial IN 1..(v_counter - 1) LOOP
    EXIT WHEN v_needed <= 0;
    
    v_serial_str := LPAD(v_check_serial::TEXT, 5, '0');
    
    -- Check if this serial already exists
    SELECT EXISTS(
      SELECT 1 FROM public.asin_inventory 
      WHERE user_id = p_user_id 
      AND serial_number = v_serial_str
    ) INTO v_exists;
    
    -- If serial doesn't exist, use it
    IF NOT v_exists THEN
      v_serials := array_append(v_serials, v_serial_str);
      v_needed := v_needed - 1;
    END IF;
  END LOOP;

  -- STRATEGY 2: Use counter for remaining serials needed
  WHILE v_needed > 0 LOOP
    v_serial_str := LPAD(v_counter::TEXT, 5, '0');
    
    -- Double-check this serial doesn't exist
    SELECT EXISTS(
      SELECT 1 FROM public.asin_inventory 
      WHERE user_id = p_user_id 
      AND serial_number = v_serial_str
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      v_serials := array_append(v_serials, v_serial_str);
      v_needed := v_needed - 1;
    END IF;
    
    v_counter := v_counter + 1;
  END LOOP;

  -- Update counter to new position
  UPDATE public.serial_number_counter
  SET next_serial = v_counter, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN v_serials;
END;
$$;