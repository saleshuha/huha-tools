-- Create vendor integrations table for Amazon Vendor Central configuration
CREATE TABLE public.vendor_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL DEFAULT 'Amazon Vendor Central',
  transport_method TEXT NOT NULL DEFAULT 'SFTP',
  sftp_host TEXT,
  sftp_port INTEGER DEFAULT 22,
  sftp_username TEXT,
  sftp_remote_path TEXT,
  country TEXT NOT NULL DEFAULT 'UAE',
  primary_key_type TEXT NOT NULL DEFAULT 'SKU', -- 'SKU' or 'ASIN'
  feed_schedule TEXT NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'manual'
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendor feed logs table for tracking XML transmissions
CREATE TABLE public.vendor_feed_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.vendor_integrations(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL DEFAULT 'inventory',
  file_name TEXT NOT NULL,
  file_path TEXT, -- Storage path in Supabase
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'acknowledged'
  total_items INTEGER DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendor item mappings table for SKU/ASIN relationships
CREATE TABLE public.vendor_item_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.vendor_integrations(id) ON DELETE CASCADE,
  internal_sku TEXT,
  internal_asin TEXT,
  vendor_sku TEXT,
  vendor_asin TEXT,
  upc TEXT,
  country TEXT NOT NULL DEFAULT 'UAE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vendor_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_feed_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_item_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vendor_integrations
CREATE POLICY "Users can view their own vendor integrations" 
ON public.vendor_integrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vendor integrations" 
ON public.vendor_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendor integrations" 
ON public.vendor_integrations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendor integrations" 
ON public.vendor_integrations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for vendor_feed_logs
CREATE POLICY "Users can view their own vendor feed logs" 
ON public.vendor_feed_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vendor feed logs" 
ON public.vendor_feed_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendor feed logs" 
ON public.vendor_feed_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for vendor_item_mappings
CREATE POLICY "Users can view their own vendor item mappings" 
ON public.vendor_item_mappings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vendor item mappings" 
ON public.vendor_item_mappings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendor item mappings" 
ON public.vendor_item_mappings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendor item mappings" 
ON public.vendor_item_mappings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create update trigger for vendor_integrations
CREATE TRIGGER update_vendor_integrations_updated_at
BEFORE UPDATE ON public.vendor_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create update trigger for vendor_item_mappings
CREATE TRIGGER update_vendor_item_mappings_updated_at
BEFORE UPDATE ON public.vendor_item_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();