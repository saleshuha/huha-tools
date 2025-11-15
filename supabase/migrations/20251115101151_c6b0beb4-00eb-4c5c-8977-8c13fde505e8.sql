-- Fix existing PO records where is_printed=true but printed_quantity=0
-- This is a data fix for items that were received but printed_quantity wasn't updated

UPDATE po_orders
SET printed_quantity = quantity
WHERE is_printed = true 
  AND (printed_quantity = 0 OR printed_quantity IS NULL);
