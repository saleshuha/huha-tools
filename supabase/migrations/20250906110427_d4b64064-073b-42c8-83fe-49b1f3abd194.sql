-- Create a separate table for noon orders processing uploads
CREATE TABLE public.noon_processing_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_nr TEXT NOT NULL,
  order_status TEXT,
  quantity INTEGER DEFAULT 1,
  order_received_at TIMESTAMP WITH TIME ZONE,
  purchase_item_nr TEXT NOT NULL,
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
  partner_sku TEXT,
  title TEXT,
  title_ar TEXT,
  brand_code TEXT,
  image_key TEXT,
  parent_sku TEXT,
  size TEXT,
  pbarcodes TEXT,
  selected_store_id UUID,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.noon_processing_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own processing orders" 
ON public.noon_processing_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own processing orders" 
ON public.noon_processing_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing orders" 
ON public.noon_processing_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processing orders" 
ON public.noon_processing_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_noon_processing_orders_updated_at
BEFORE UPDATE ON public.noon_processing_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();