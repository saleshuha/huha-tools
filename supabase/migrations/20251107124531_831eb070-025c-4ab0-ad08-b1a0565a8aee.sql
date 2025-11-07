-- Fix incorrect bulk fulfillment for PO 4RWCADIN
-- This migration reverts all incorrectly marked items and cleans up duplicate records

-- Step 1: Revert ALL po_orders items to pending status first
UPDATE po_orders
SET 
  status = 'pending',
  notes = NULL,
  updated_at = NOW()
WHERE po_number = '4RWCADIN';

-- Step 2: Re-mark ONLY B0FHDWY5FF as closed with the correct fulfillment notes
UPDATE po_orders
SET 
  status = 'closed',
  notes = 'Fulfilled 1 units from in-stock inventory. Serial: A10. Remaining stock: 19',
  updated_at = '2025-11-07 12:34:24.308842+00'
WHERE po_number = '4RWCADIN' 
  AND asin = 'B0FHDWY5FF';

-- Step 3: Delete all 64 incorrect fulfillment_history records from the bulk error
DELETE FROM fulfillment_history
WHERE po_number = '4RWCADIN'
  AND created_at = '2025-11-07 12:34:02.757596+00';

-- Verify: Only 1 fulfillment_history record should remain (created_at: 2025-11-07 12:34:24)
-- Verify: Only B0FHDWY5FF should have status='closed', all others should be 'pending'