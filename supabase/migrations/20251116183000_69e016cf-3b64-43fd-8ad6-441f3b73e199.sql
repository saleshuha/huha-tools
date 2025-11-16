-- Create function to auto-update priorities for ungrouped POs
CREATE OR REPLACE FUNCTION update_ungrouped_po_priorities(user_id_param uuid)
RETURNS TABLE(updated_count integer, new_priority integer, max_grouped_priority integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_priority integer;
  new_auto_priority integer;
  updated_rows integer;
BEGIN
  -- Find max priority from POs that ARE in groups
  SELECT COALESCE(MAX(po.priority), 0) INTO max_priority
  FROM po_orders po
  INNER JOIN po_group_members pgm ON pgm.po_id = po.id
  WHERE po.user_id = user_id_param;
  
  -- Set auto priority to max + 1 (minimum 6 to keep standard 1-5 for groups)
  new_auto_priority := GREATEST(max_priority + 1, 6);
  
  -- Update all POs that are NOT in any group
  UPDATE po_orders po
  SET priority = new_auto_priority
  WHERE po.user_id = user_id_param
    AND po.id NOT IN (
      SELECT po_id FROM po_group_members
    )
    AND (po.priority IS NULL OR po.priority != new_auto_priority);
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  RETURN QUERY SELECT updated_rows, new_auto_priority, max_priority;
END;
$$;