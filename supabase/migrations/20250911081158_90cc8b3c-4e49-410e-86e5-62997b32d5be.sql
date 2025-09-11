-- Add printed_quantity column to track how many labels have been printed for each PO item
ALTER TABLE public.po_orders 
ADD COLUMN printed_quantity integer DEFAULT 0 NOT NULL;

-- Add a check constraint to ensure printed_quantity doesn't exceed total quantity
ALTER TABLE public.po_orders 
ADD CONSTRAINT check_printed_quantity_valid 
CHECK (printed_quantity >= 0 AND printed_quantity <= quantity);