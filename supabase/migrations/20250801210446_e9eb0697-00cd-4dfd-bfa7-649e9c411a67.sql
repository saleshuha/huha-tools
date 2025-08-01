-- Create table for Noon sales data uploads
CREATE TABLE public.noon_sales_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_month TEXT NOT NULL,
  
  -- Core fields from headers
  id_partner TEXT,
  marketplace TEXT,
  country_code TEXT NOT NULL DEFAULT 'UAE',
  is_fbn BOOLEAN,
  item_nr TEXT,
  sku TEXT,
  family TEXT,
  product_type TEXT,
  product_subtype TEXT,
  brand_en TEXT,
  brand_ar TEXT,
  title_en TEXT,
  title_ar TEXT,
  purchase_item_nr TEXT,
  awb_nr TEXT,
  
  -- Financial fields
  base_price NUMERIC,
  invoice_price NUMERIC,
  
  -- Status and dates
  item_status TEXT,
  cancel_reason TEXT,
  ordered_date TIMESTAMP WITH TIME ZONE,
  shipped_date TIMESTAMP WITH TIME ZONE,
  delivered_date TIMESTAMP WITH TIME ZONE,
  cancelled_date TIMESTAMP WITH TIME ZONE,
  returned_date TIMESTAMP WITH TIME ZONE,
  estimated_shipping_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.noon_sales_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sales data" 
ON public.noon_sales_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales data" 
ON public.noon_sales_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales data" 
ON public.noon_sales_data 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales data" 
ON public.noon_sales_data 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add foreign key to stores
ALTER TABLE public.noon_sales_data 
ADD CONSTRAINT fk_noon_sales_data_store 
FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_noon_sales_data_updated_at
BEFORE UPDATE ON public.noon_sales_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();