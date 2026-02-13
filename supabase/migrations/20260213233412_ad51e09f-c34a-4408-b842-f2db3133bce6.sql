
-- Create a function to get group summaries in a single query
-- Replaces N+1 queries per group with one efficient call
CREATE OR REPLACE FUNCTION get_po_group_summaries(p_user_id uuid)
RETURNS TABLE(
  group_id uuid,
  member_count bigint,
  total_quantity bigint,
  po_numbers text[]
) AS $$
  SELECT 
    pgm.group_id,
    COUNT(pgm.po_id) as member_count,
    COALESCE(SUM(po.quantity), 0) as total_quantity,
    ARRAY_AGG(DISTINCT po.po_number) as po_numbers
  FROM po_group_members pgm
  JOIN po_orders po ON po.id = pgm.po_id
  JOIN po_groups pg ON pg.id = pgm.group_id
  WHERE pg.user_id = p_user_id AND pg.status = 'active'
  GROUP BY pgm.group_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
