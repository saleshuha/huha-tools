-- Add priority column to po_orders table for fulfillment prioritization
ALTER TABLE po_orders 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 
CHECK (priority BETWEEN 1 AND 5);

-- Add helpful comment
COMMENT ON COLUMN po_orders.priority IS 
'Priority level for stock fulfillment: 1=Highest, 2=High, 3=Normal (default), 4=Low, 5=Lowest';

-- Create composite index for efficient priority-based queries
CREATE INDEX IF NOT EXISTS idx_po_orders_priority_delivery 
ON po_orders(user_id, status, priority, expected_delivery) 
WHERE status IN ('pending', 'placed');