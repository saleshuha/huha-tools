-- Create sku_inventory table
CREATE TABLE public.sku_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sku_number TEXT NOT NULL,
  bin_serial_number TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in-stock',
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_sold TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  country TEXT NOT NULL DEFAULT 'UAE',
  restock_date TIMESTAMP WITH TIME ZONE,
  restock_quantity INTEGER,
  last_restock_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sku_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for sku_inventory
CREATE POLICY "Users can view their own SKU inventory" 
ON public.sku_inventory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SKU inventory" 
ON public.sku_inventory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SKU inventory" 
ON public.sku_inventory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SKU inventory" 
ON public.sku_inventory 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create sunsky_credentials table
CREATE TABLE public.sunsky_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sunsky_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for sunsky_credentials
CREATE POLICY "Users can manage their own credentials" 
ON public.sunsky_credentials 
FOR ALL 
USING (auth.uid() = user_id);

-- Create sunsky_skus table
CREATE TABLE public.sunsky_skus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sku_code TEXT NOT NULL,
  title TEXT,
  cost NUMERIC,
  weight NUMERIC,
  currency TEXT DEFAULT 'USD',
  country TEXT NOT NULL DEFAULT 'UAE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sunsky_skus ENABLE ROW LEVEL SECURITY;

-- Create policies for sunsky_skus
CREATE POLICY "Users can view their own SKUs" 
ON public.sunsky_skus 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SKUs" 
ON public.sunsky_skus 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SKUs" 
ON public.sunsky_skus 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SKUs" 
ON public.sunsky_skus 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_sku_inventory_updated_at
BEFORE UPDATE ON public.sku_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sunsky_credentials_updated_at
BEFORE UPDATE ON public.sunsky_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sunsky_skus_updated_at
BEFORE UPDATE ON public.sunsky_skus
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();