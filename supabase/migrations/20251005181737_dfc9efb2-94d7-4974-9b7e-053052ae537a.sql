-- Enhanced Stock History Tracking System
-- Add comprehensive tracking fields to stock_changes table

-- Add new columns for enhanced tracking
ALTER TABLE public.stock_changes
ADD COLUMN IF NOT EXISTS reference_type text,
ADD COLUMN IF NOT EXISTS reference_id uuid,
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS changed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fulfillment_source text,
ADD COLUMN IF NOT EXISTS batch_id uuid,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_changes_reference_type ON public.stock_changes(reference_type);
CREATE INDEX IF NOT EXISTS idx_stock_changes_reference_id ON public.stock_changes(reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_changes_reference_number ON public.stock_changes(reference_number);
CREATE INDEX IF NOT EXISTS idx_stock_changes_changed_by ON public.stock_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_stock_changes_batch_id ON public.stock_changes(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_changes_created_at ON public.stock_changes(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.stock_changes.reference_type IS 'Type of transaction: po_order, manual, sale, restock, return, damage, adjustment';
COMMENT ON COLUMN public.stock_changes.reference_id IS 'UUID reference to related record (po_orders.id, etc.)';
COMMENT ON COLUMN public.stock_changes.reference_number IS 'Human-readable reference (PO number, order number, etc.)';
COMMENT ON COLUMN public.stock_changes.changed_by IS 'User who made the change';
COMMENT ON COLUMN public.stock_changes.fulfillment_source IS 'Source of fulfillment: stock, direct_order, transfer';
COMMENT ON COLUMN public.stock_changes.batch_id IS 'Groups related changes together';
COMMENT ON COLUMN public.stock_changes.notes IS 'Additional notes about the change';
COMMENT ON COLUMN public.stock_changes.metadata IS 'Additional structured data (ASIN, SKU, cost, etc.)';

-- Backfill existing records with default values
UPDATE public.stock_changes
SET reference_type = CASE 
  WHEN change_reason ILIKE '%sale%' THEN 'sale'
  WHEN change_reason ILIKE '%restock%' THEN 'restock'
  WHEN change_reason ILIKE '%return%' THEN 'return'
  WHEN change_reason ILIKE '%damage%' THEN 'damage'
  ELSE 'manual'
END
WHERE reference_type IS NULL;

-- Update changed_by for existing records to the user_id
UPDATE public.stock_changes
SET changed_by = user_id
WHERE changed_by IS NULL;

-- Create function to auto-populate changed_by
CREATE OR REPLACE FUNCTION public.set_stock_change_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.changed_by IS NULL THEN
    NEW.changed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-populate changed_by
DROP TRIGGER IF EXISTS trigger_set_stock_change_user ON public.stock_changes;
CREATE TRIGGER trigger_set_stock_change_user
  BEFORE INSERT ON public.stock_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stock_change_user();