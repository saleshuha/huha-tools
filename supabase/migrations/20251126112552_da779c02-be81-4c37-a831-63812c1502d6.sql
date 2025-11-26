-- Create batch serial number generation function to prevent race conditions
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
BEGIN
  -- Lock and get current counter
  SELECT next_serial INTO v_counter
  FROM public.serial_number_counter
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- If no counter exists, initialize it
  IF v_counter IS NULL THEN
    INSERT INTO public.serial_number_counter (user_id, next_serial)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id) DO NOTHING;
    v_counter := 1;
  END IF;

  -- Generate p_count serial numbers atomically
  FOR i IN 1..p_count LOOP
    v_serial_str := LPAD(v_counter::TEXT, 5, '0');
    v_serials := array_append(v_serials, v_serial_str);
    v_counter := v_counter + 1;
  END LOOP;

  -- Update counter once at the end
  UPDATE public.serial_number_counter
  SET next_serial = v_counter, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN v_serials;
END;
$$;