-- Add linked_items JSONB column to supplier_bills for reconciliation item tracking
ALTER TABLE public.supplier_bills 
ADD COLUMN IF NOT EXISTS linked_items jsonb DEFAULT '[]'::jsonb;

-- Add supplier_name column to supplier_bills for direct supplier name tracking (from purchase links)
ALTER TABLE public.supplier_bills 
ADD COLUMN IF NOT EXISTS supplier_name text;

COMMENT ON COLUMN public.supplier_bills.linked_items IS 'Array of {link_id, asin, sku, qty, unit_cost} objects matched during reconciliation';
COMMENT ON COLUMN public.supplier_bills.supplier_name IS 'Supplier name from market purchase links for direct matching';