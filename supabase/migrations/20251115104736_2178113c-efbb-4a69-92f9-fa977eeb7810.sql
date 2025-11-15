-- Close all POs where printed_quantity >= quantity but status is still pending/placed
UPDATE po_orders
SET 
  status = 'closed',
  updated_at = NOW()
WHERE 
  status IN ('pending', 'placed')
  AND printed_quantity >= quantity
  AND is_printed = true;

-- Log the count of updated records
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % fully received POs to closed status', updated_count;
END $$;