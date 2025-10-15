-- Remove the overly restrictive unique constraint that blocks all duplicates
ALTER TABLE public.po_orders DROP CONSTRAINT IF EXISTS po_orders_user_po_item_key;
DROP INDEX IF EXISTS idx_po_orders_unique_identity;

-- Add a new composite index for better queries but NO uniqueness enforcement
CREATE INDEX IF NOT EXISTS idx_po_orders_lookup 
ON public.po_orders (user_id, po_key, item_key, created_at DESC);

-- Add a batch_id column to group imports from the same upload session
ALTER TABLE public.po_orders 
ADD COLUMN IF NOT EXISTS batch_id uuid DEFAULT NULL;

-- Add index for batch operations
CREATE INDEX IF NOT EXISTS idx_po_orders_batch 
ON public.po_orders (user_id, batch_id) 
WHERE batch_id IS NOT NULL;

-- Add comment explaining the new approach
COMMENT ON COLUMN public.po_orders.batch_id IS 'Groups items from the same upload session for tracking and duplicate detection';