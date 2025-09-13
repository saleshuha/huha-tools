-- Add printed_quantity column to po_orders table if it doesn't exist
ALTER TABLE public.po_orders 
ADD COLUMN IF NOT EXISTS printed_quantity integer DEFAULT 0;