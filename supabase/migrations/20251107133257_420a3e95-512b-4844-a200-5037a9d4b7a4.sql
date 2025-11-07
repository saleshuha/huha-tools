-- Backfill status history for existing orders
-- This will create initial status history entries for all existing orders

INSERT INTO public.po_status_history (
  po_order_id,
  po_number,
  previous_status,
  new_status,
  changed_at,
  changed_by,
  user_id,
  notes
)
SELECT 
  po.id,
  po.po_number,
  NULL, -- No previous status for initial backfill
  po.status,
  po.updated_at, -- Use the order's updated_at as the change time
  po.user_id,
  po.user_id,
  CASE 
    WHEN po.status = 'closed' THEN 'Order closed (backfilled from updated_at: ' || po.updated_at::text || ')'
    WHEN po.status = 'cancelled' THEN 'Order cancelled (backfilled from updated_at: ' || po.updated_at::text || ')'
    ELSE 'Current status: ' || po.status || ' (backfilled from updated_at: ' || po.updated_at::text || ')'
  END
FROM public.po_orders po
WHERE NOT EXISTS (
  -- Don't create duplicates if history already exists
  SELECT 1 FROM public.po_status_history psh
  WHERE psh.po_order_id = po.id
)
ON CONFLICT DO NOTHING;

-- Update the trigger function to use changed_at instead of created_at for more accurate timestamps
CREATE OR REPLACE FUNCTION log_po_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.po_status_history (
      po_order_id,
      po_number,
      previous_status,
      new_status,
      changed_at,
      changed_by,
      user_id,
      notes
    ) VALUES (
      NEW.id,
      NEW.po_number,
      OLD.status,
      NEW.status,
      now(), -- Use current timestamp for when the change actually happened
      NEW.user_id,
      NEW.user_id,
      'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status || 
      CASE 
        WHEN NEW.notes IS NOT NULL AND NEW.notes != OLD.notes 
        THEN '. Notes: ' || NEW.notes 
        ELSE '' 
      END
    );
  END IF;
  
  -- For new inserts, log the initial status
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.po_status_history (
      po_order_id,
      po_number,
      previous_status,
      new_status,
      changed_at,
      changed_by,
      user_id,
      notes
    ) VALUES (
      NEW.id,
      NEW.po_number,
      NULL,
      NEW.status,
      now(),
      NEW.user_id,
      NEW.user_id,
      'Order created with status: ' || NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;