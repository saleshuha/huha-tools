-- Update existing closed PO items that were fulfilled from stock
-- Extract the quantity from the notes field and restore it
UPDATE public.po_orders
SET quantity = CAST(
  SUBSTRING(
    notes FROM 'Fulfilled from stock: ([0-9]+) units'
  ) AS INTEGER
)
WHERE status = 'closed'
  AND quantity = 0
  AND notes LIKE 'Fulfilled from stock:%'
  AND notes ~ 'Fulfilled from stock: [0-9]+ units';

-- Verify the update
-- SELECT po_number, asin, sku_code, quantity, status, notes
-- FROM public.po_orders
-- WHERE status = 'closed' AND notes LIKE 'Fulfilled from stock:%'
-- LIMIT 5;