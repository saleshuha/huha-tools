-- Add unique constraint for PO duplicate detection
-- This ensures no duplicate items can be inserted for the same user, PO, and item combination

-- First, check if constraint already exists and drop it if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'po_orders_user_po_item_key'
  ) THEN
    ALTER TABLE public.po_orders DROP CONSTRAINT po_orders_user_po_item_key;
  END IF;
END $$;

-- Create unique constraint on (user_id, po_key, item_key)
-- This prevents duplicate PO items from being inserted
ALTER TABLE public.po_orders
ADD CONSTRAINT po_orders_user_po_item_key UNIQUE (user_id, po_key, item_key);

-- Add index for better query performance on duplicate checks
CREATE INDEX IF NOT EXISTS idx_po_orders_identity 
ON public.po_orders (user_id, po_key, item_key) 
WHERE po_key IS NOT NULL AND item_key IS NOT NULL;