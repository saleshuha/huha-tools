-- Add vendor info fields to purchase_updates table
ALTER TABLE public.purchase_updates 
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS vendor_email TEXT,
ADD COLUMN IF NOT EXISTS supplier_order_number TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2);

-- Add password protection and view tracking to purchase_links
ALTER TABLE public.purchase_links
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_updates_count INTEGER DEFAULT 0;

-- Create purchase_link_activity table for activity logging
CREATE TABLE IF NOT EXISTS public.purchase_link_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES public.purchase_links(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  details JSONB,
  vendor_name TEXT,
  vendor_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);

-- Enable RLS on activity table
ALTER TABLE public.purchase_link_activity ENABLE ROW LEVEL SECURITY;

-- Policy for link owners to view activity
CREATE POLICY "Link owners can view activity" ON public.purchase_link_activity
FOR SELECT USING (
  link_id IN (SELECT id FROM public.purchase_links WHERE user_id = auth.uid())
);

-- Policy to allow inserts from edge functions (public access for anonymous updates)
CREATE POLICY "Allow activity logging" ON public.purchase_link_activity
FOR INSERT WITH CHECK (true);

-- Create function to track link access
CREATE OR REPLACE FUNCTION public.track_link_access()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.purchase_links 
  SET access_count = COALESCE(access_count, 0) + 1,
      last_accessed_at = now()
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for activity-based access tracking
DROP TRIGGER IF EXISTS on_link_activity_access ON public.purchase_link_activity;
CREATE TRIGGER on_link_activity_access
  AFTER INSERT ON public.purchase_link_activity
  FOR EACH ROW
  WHEN (NEW.activity_type = 'view')
  EXECUTE FUNCTION public.track_link_access();

-- Create function to update total_updates_count
CREATE OR REPLACE FUNCTION public.update_link_updates_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.purchase_links 
  SET total_updates_count = (
    SELECT COUNT(*) FROM public.purchase_updates WHERE link_id = NEW.link_id
  )
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updates count tracking
DROP TRIGGER IF EXISTS on_purchase_update_count ON public.purchase_updates;
CREATE TRIGGER on_purchase_update_count
  AFTER INSERT OR DELETE ON public.purchase_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_link_updates_count();

-- Enable realtime for the new activity table
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_link_activity;