-- Fix search_path security issue for remove_po_duplicates function
CREATE OR REPLACE FUNCTION remove_po_duplicates(po_number_param TEXT, user_id_param UUID)
RETURNS TABLE (
  deleted_count INTEGER,
  remaining_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_remaining_count INTEGER;
BEGIN
  -- Delete duplicates, keeping the oldest (first created) entry
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY po_number, asin, COALESCE(model_number, ''), COALESCE(sku_code, ''), quantity 
             ORDER BY created_at ASC
           ) as rn
    FROM po_orders
    WHERE po_number = po_number_param 
      AND user_id = user_id_param
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
  WHERE po_number = po_number_param 
    AND user_id = user_id_param;
  
  RETURN QUERY SELECT v_deleted_count, v_remaining_count;
END;
$$;