-- Update the check constraint to allow 'closed' status
ALTER TABLE public.po_orders 
DROP CONSTRAINT po_orders_status_check;

ALTER TABLE public.po_orders 
ADD CONSTRAINT po_orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'placed'::text, 'received'::text, 'cancelled'::text, 'closed'::text]));