-- Create enum for inventory status
CREATE TYPE public.inventory_status AS ENUM ('in-stock', 'sold', 'reserved', 'damaged');

-- Create ASIN inventory table
CREATE TABLE public.asin_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  status inventory_status NOT NULL DEFAULT 'in-stock',
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_sold TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SKU inventory table
CREATE TABLE public.sku_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku_number TEXT NOT NULL,
  bin_serial_number TEXT NOT NULL,
  status inventory_status NOT NULL DEFAULT 'in-stock',
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.asin_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_inventory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ASIN inventory
CREATE POLICY "Users can view their own ASIN inventory" 
ON public.asin_inventory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ASIN inventory" 
ON public.asin_inventory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ASIN inventory" 
ON public.asin_inventory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ASIN inventory" 
ON public.asin_inventory 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for SKU inventory
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_asin_inventory_updated_at
  BEFORE UPDATE ON public.asin_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sku_inventory_updated_at
  BEFORE UPDATE ON public.sku_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_asin_inventory_user_id ON public.asin_inventory(user_id);
CREATE INDEX idx_asin_inventory_status ON public.asin_inventory(status);
CREATE INDEX idx_asin_inventory_date_added ON public.asin_inventory(date_added);

CREATE INDEX idx_sku_inventory_user_id ON public.sku_inventory(user_id);
CREATE INDEX idx_sku_inventory_status ON public.sku_inventory(status);
CREATE INDEX idx_sku_inventory_date_added ON public.sku_inventory(date_added);