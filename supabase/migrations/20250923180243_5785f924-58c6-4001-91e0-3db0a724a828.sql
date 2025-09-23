-- Add fulfillment tracking to PO orders
-- Create a fulfillment_history table to track stock fulfillments even if PO records are modified
CREATE TABLE IF NOT EXISTS public.fulfillment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  po_number TEXT NOT NULL,
  asin TEXT,
  sku_code TEXT,
  model_number TEXT,
  original_quantity INTEGER NOT NULL,
  fulfilled_quantity INTEGER NOT NULL,
  fulfillment_source TEXT NOT NULL DEFAULT 'stock', -- 'stock', 'supplier', 'partial'
  inventory_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fulfillment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own fulfillment history" 
ON public.fulfillment_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fulfillment history" 
ON public.fulfillment_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fulfillment history" 
ON public.fulfillment_history 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to log fulfillment when PO orders are fulfilled from stock
CREATE OR REPLACE FUNCTION public.log_po_fulfillment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status changes to closed and notes indicate stock fulfillment
  IF NEW.status = 'closed' AND NEW.notes IS NOT NULL AND NEW.notes LIKE '%Fulfilled from stock:%' THEN
    -- Extract fulfilled quantity from notes
    DECLARE
      fulfilled_qty INTEGER;
      original_qty INTEGER;
    BEGIN
      -- Parse fulfilled quantity from notes pattern "Fulfilled from stock: X pcs"
      fulfilled_qty := (regexp_match(NEW.notes, 'Fulfilled from stock:\s*(\d+)'))[1]::INTEGER;
      -- Parse original quantity from notes pattern "Original quantity: X pcs"
      original_qty := COALESCE((regexp_match(NEW.notes, 'Original quantity:\s*(\d+)'))[1]::INTEGER, OLD.quantity);
      
      -- Insert into fulfillment history
      INSERT INTO public.fulfillment_history (
        user_id,
        po_number,
        asin,
        sku_code,
        model_number,
        original_quantity,
        fulfilled_quantity,
        fulfillment_source,
        notes
      ) VALUES (
        NEW.user_id,
        NEW.po_number,
        NEW.asin,
        NEW.sku_code,
        NEW.model_number,
        original_qty,
        fulfilled_qty,
        'stock',
        NEW.notes
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, still log with available data
      INSERT INTO public.fulfillment_history (
        user_id,
        po_number,
        asin,
        sku_code,
        model_number,
        original_quantity,
        fulfilled_quantity,
        fulfillment_source,
        notes
      ) VALUES (
        NEW.user_id,
        NEW.po_number,
        NEW.asin,
        NEW.sku_code,
        NEW.model_number,
        COALESCE(OLD.quantity, NEW.quantity),
        0,
        'stock',
        NEW.notes
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for logging fulfillments
DROP TRIGGER IF EXISTS trigger_log_po_fulfillment ON public.po_orders;
CREATE TRIGGER trigger_log_po_fulfillment
  AFTER UPDATE ON public.po_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_po_fulfillment();