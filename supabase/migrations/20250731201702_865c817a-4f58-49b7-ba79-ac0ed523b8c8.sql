-- Add 'shipped' to the status check constraint
ALTER TABLE carrefour_payments 
DROP CONSTRAINT IF EXISTS carrefour_payments_status_check;

ALTER TABLE carrefour_payments 
ADD CONSTRAINT carrefour_payments_status_check 
CHECK (status IN ('Delivered', 'Returned', 'Cancelled', 'Shipped', 'Other'));