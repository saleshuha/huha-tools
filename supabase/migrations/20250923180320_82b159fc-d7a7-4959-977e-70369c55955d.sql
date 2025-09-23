-- Fix security issues: Add proper search_path to functions

-- Update the log_po_fulfillment function with proper search_path
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;