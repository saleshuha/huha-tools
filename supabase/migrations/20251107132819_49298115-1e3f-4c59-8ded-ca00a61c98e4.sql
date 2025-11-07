-- Create PO Status History table
CREATE TABLE IF NOT EXISTS public.po_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_order_id UUID NOT NULL,
  po_number TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID NOT NULL,
  change_reason TEXT,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.po_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own status history"
  ON public.po_status_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own status history"
  ON public.po_status_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_po_status_history_po_number ON public.po_status_history(po_number);
CREATE INDEX idx_po_status_history_po_order_id ON public.po_status_history(po_order_id);
CREATE INDEX idx_po_status_history_user_id ON public.po_status_history(user_id);
CREATE INDEX idx_po_status_history_changed_at ON public.po_status_history(changed_at DESC);

-- Create function to automatically log status changes
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
      changed_by,
      user_id,
      notes
    ) VALUES (
      NEW.id,
      NEW.po_number,
      OLD.status,
      NEW.status,
      NEW.user_id,
      NEW.user_id,
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  
  -- For new inserts, log the initial status
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.po_status_history (
      po_order_id,
      po_number,
      previous_status,
      new_status,
      changed_by,
      user_id,
      notes
    ) VALUES (
      NEW.id,
      NEW.po_number,
      NULL,
      NEW.status,
      NEW.user_id,
      NEW.user_id,
      'Order created with status: ' || NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on po_orders table
DROP TRIGGER IF EXISTS po_status_change_trigger ON public.po_orders;
CREATE TRIGGER po_status_change_trigger
  AFTER INSERT OR UPDATE OF status
  ON public.po_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_po_status_change();