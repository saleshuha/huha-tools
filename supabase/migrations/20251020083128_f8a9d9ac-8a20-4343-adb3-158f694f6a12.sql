-- Function to remove ALL duplicate PO orders for a user
-- Keeps the oldest entry for each unique combination
CREATE OR REPLACE FUNCTION remove_all_po_duplicates(user_id_param UUID)
RETURNS TABLE (
  deleted_count INTEGER,
  remaining_count INTEGER,
  affected_po_numbers TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_remaining_count INTEGER;
  v_affected_pos TEXT[];
BEGIN
  -- Get list of affected PO numbers before deletion
  SELECT ARRAY_AGG(DISTINCT po_number) INTO v_affected_pos
  FROM (
    SELECT po_number,
           ROW_NUMBER() OVER (
             PARTITION BY po_number, asin, COALESCE(model_number, ''), COALESCE(sku_code, ''), quantity 
             ORDER BY created_at ASC
           ) as rn
    FROM po_orders
    WHERE user_id = user_id_param
  ) dupes
  WHERE rn > 1;
  
  -- Delete all duplicates, keeping the oldest (first created) entry
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY po_number, asin, COALESCE(model_number, ''), COALESCE(sku_code, ''), quantity 
             ORDER BY created_at ASC
           ) as rn
    FROM po_orders
    WHERE user_id = user_id_param
  )
  DELETE FROM po_orders
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  -- Get count of deleted rows
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Get remaining count
  SELECT COUNT(*) INTO v_remaining_count
  FROM po_orders
  WHERE user_id = user_id_param;
  
  RETURN QUERY SELECT 
    v_deleted_count, 
    v_remaining_count, 
    COALESCE(v_affected_pos, ARRAY[]::TEXT[]);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_all_po_duplicates(UUID) TO authenticated;