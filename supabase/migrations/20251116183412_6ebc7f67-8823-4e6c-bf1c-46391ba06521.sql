-- Drop the old constraint that limits priority to 1-5
ALTER TABLE po_orders 
DROP CONSTRAINT IF EXISTS po_orders_priority_check;

-- Add new constraint allowing priorities 1-100
ALTER TABLE po_orders 
ADD CONSTRAINT po_orders_priority_check 
CHECK (priority >= 1 AND priority <= 100);