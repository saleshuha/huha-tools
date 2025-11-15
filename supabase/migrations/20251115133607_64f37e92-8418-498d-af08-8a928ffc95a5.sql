-- Create serial number counter table
CREATE TABLE IF NOT EXISTS serial_number_counter (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  next_serial INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE serial_number_counter ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own serial counter"
  ON serial_number_counter FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own serial counter"
  ON serial_number_counter FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own serial counter"
  ON serial_number_counter FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create atomic serial number generator function
CREATE OR REPLACE FUNCTION get_next_serial_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_serial INTEGER;
  v_serial_str TEXT;
  v_is_duplicate BOOLEAN;
BEGIN
  -- Initialize counter if it doesn't exist
  INSERT INTO serial_number_counter (user_id, next_serial)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Loop until we find an unused serial (handles gaps and duplicates)
  LOOP
    -- Get and increment counter atomically with row lock
    UPDATE serial_number_counter
    SET next_serial = next_serial + 1,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING next_serial - 1 INTO v_next_serial;
    
    -- Format as 5-digit string
    v_serial_str := LPAD(v_next_serial::TEXT, 5, '0');
    
    -- Check if this serial already exists (handles edge cases)
    SELECT EXISTS(
      SELECT 1 FROM asin_inventory 
      WHERE user_id = p_user_id 
      AND serial_number = v_serial_str
    ) INTO v_is_duplicate;
    
    -- If not duplicate, return it
    IF NOT v_is_duplicate THEN
      RETURN v_serial_str;
    END IF;
    
    -- If duplicate, loop continues with next number
  END LOOP;
END;
$$;

-- Initialize counters for all existing users based on their max serial
INSERT INTO serial_number_counter (user_id, next_serial)
SELECT 
  user_id,
  COALESCE(
    (SELECT MAX(CAST(serial_number AS INTEGER)) + 1
     FROM asin_inventory ai2
     WHERE ai2.user_id = ai.user_id
     AND serial_number ~ '^\d+$'
     AND serial_number != ''
     AND LENGTH(serial_number) <= 10),
    1
  ) as next_serial
FROM asin_inventory ai
WHERE user_id IS NOT NULL
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE
SET next_serial = EXCLUDED.next_serial
WHERE serial_number_counter.next_serial < EXCLUDED.next_serial;