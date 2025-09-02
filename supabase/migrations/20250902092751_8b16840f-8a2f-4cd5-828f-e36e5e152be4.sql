-- Create noon_orders table for tracking Noon orders
CREATE TABLE public.noon_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_nr TEXT NOT NULL,
  order_status TEXT,
  quantity INTEGER DEFAULT 1,
  order_received_at TIMESTAMP WITH TIME ZONE,
  purchase_item_nr TEXT,
  order_country_code TEXT DEFAULT 'UAE',
  manifest_nr TEXT,
  shipment_nr TEXT,
  fulfillment_timestamp TIMESTAMP WITH TIME ZONE,
  shipment_created_by TEXT,
  shipment_user TEXT,
  shipment_created_at TIMESTAMP WITH TIME ZONE,
  id_warehouse_configuration TEXT,
  target_ready_at TIMESTAMP WITH TIME ZONE,
  item_status TEXT,
  is_reprintable BOOLEAN DEFAULT false,
  is_printed BOOLEAN DEFAULT false,
  mp_code TEXT,
  sku TEXT,
  partner_sku TEXT, -- This is the Sunsky item number
  title TEXT,
  title_ar TEXT,
  brand_code TEXT,
  image_key TEXT,
  parent_sku TEXT,
  size TEXT,
  pbarcodes TEXT,
  -- Sunsky integration fields
  sunsky_order_number TEXT,
  sunsky_order_status INTEGER,
  sunsky_tracking_number TEXT,
  sunsky_credentials_id UUID,
  sunsky_last_sync TIMESTAMP WITH TIME ZONE,
  sunsky_error_message TEXT,
  -- Metadata
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.noon_orders ENABLE ROW LEVEL SECURITY;

-- Create unique constraint on order_nr per user
CREATE UNIQUE INDEX idx_noon_orders_user_order_nr ON public.noon_orders (user_id, order_nr);

-- Create policies
CREATE POLICY "Users can create their own noon orders"
ON public.noon_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own noon orders"
ON public.noon_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own noon orders"
ON public.noon_orders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own noon orders"
ON public.noon_orders
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_noon_orders_updated_at
BEFORE UPDATE ON public.noon_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();