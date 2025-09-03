-- Create noon_order_events table for audit trail and timeline
CREATE TABLE public.noon_order_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  noon_order_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'status_change', 'sunsky_linked', 'placed', 'synced', 'manual_update', etc
  event_message TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.noon_order_events ENABLE ROW LEVEL SECURITY;

-- Create policies for noon_order_events
CREATE POLICY "Users can view their own order events" 
ON public.noon_order_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own order events" 
ON public.noon_order_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger to auto-log status changes on noon_orders
CREATE OR REPLACE FUNCTION public.log_noon_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    INSERT INTO public.noon_order_events (
      user_id,
      noon_order_id,
      event_type,
      event_message,
      event_data
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'status_change',
      CASE 
        WHEN NEW.order_status = 'uploaded' THEN 'Order uploaded to system'
        WHEN NEW.order_status = 'validated' THEN 'Order validated and ready for processing'
        WHEN NEW.order_status = 'ready_for_sunsky' THEN 'Order ready to be placed with Sunsky'
        WHEN NEW.order_status = 'placed' THEN 'Order placed with Sunsky'
        WHEN NEW.order_status = 'shipped' THEN 'Order shipped by Sunsky'
        WHEN NEW.order_status = 'delivered' THEN 'Order delivered'
        WHEN NEW.order_status = 'exception' THEN 'Order moved to exceptions queue'
        ELSE CONCAT('Status changed from ', COALESCE(OLD.order_status, 'null'), ' to ', NEW.order_status)
      END,
      jsonb_build_object(
        'old_status', OLD.order_status,
        'new_status', NEW.order_status,
        'sunsky_order_number', NEW.sunsky_order_number,
        'order_nr', NEW.order_nr
      )
    );
  END IF;
  
  -- Log Sunsky linking
  IF OLD.sunsky_order_number IS DISTINCT FROM NEW.sunsky_order_number AND NEW.sunsky_order_number IS NOT NULL THEN
    INSERT INTO public.noon_order_events (
      user_id,
      noon_order_id,
      event_type,
      event_message,
      event_data
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'sunsky_linked',
      CONCAT('Linked to Sunsky order: ', NEW.sunsky_order_number),
      jsonb_build_object(
        'sunsky_order_number', NEW.sunsky_order_number,
        'old_sunsky_order_number', OLD.sunsky_order_number
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on noon_orders
CREATE TRIGGER noon_order_status_change_trigger
  AFTER UPDATE ON public.noon_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_noon_order_status_change();

-- Add indexes for better performance
CREATE INDEX idx_noon_order_events_user_id ON public.noon_order_events(user_id);
CREATE INDEX idx_noon_order_events_noon_order_id ON public.noon_order_events(noon_order_id);
CREATE INDEX idx_noon_order_events_created_at ON public.noon_order_events(created_at DESC);

-- Enable realtime for noon_orders and noon_order_events
ALTER TABLE public.noon_orders REPLICA IDENTITY FULL;
ALTER TABLE public.noon_order_events REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.noon_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.noon_order_events;