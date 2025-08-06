-- Create Sunsky SKUs table for supplier SKU management
CREATE TABLE public.sunsky_skus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sku_code TEXT NOT NULL,
  description TEXT,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sku_code)
);

-- Create PO Orders table for tracking purchase orders
CREATE TABLE public.po_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  po_number TEXT NOT NULL,
  sku_code TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'placed', 'received', 'cancelled')),
  order_date TIMESTAMP WITH TIME ZONE,
  expected_delivery TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sunsky_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for sunsky_skus
CREATE POLICY "Users can view their own Sunsky SKUs" 
ON public.sunsky_skus 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Sunsky SKUs" 
ON public.sunsky_skus 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Sunsky SKUs" 
ON public.sunsky_skus 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Sunsky SKUs" 
ON public.sunsky_skus 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for po_orders
CREATE POLICY "Users can view their own PO orders" 
ON public.po_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own PO orders" 
ON public.po_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PO orders" 
ON public.po_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PO orders" 
ON public.po_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_sunsky_skus_updated_at
BEFORE UPDATE ON public.sunsky_skus
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_po_orders_updated_at
BEFORE UPDATE ON public.po_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sunsky_skus_user_id ON public.sunsky_skus(user_id);
CREATE INDEX idx_sunsky_skus_sku_code ON public.sunsky_skus(sku_code);
CREATE INDEX idx_po_orders_user_id ON public.po_orders(user_id);
CREATE INDEX idx_po_orders_po_number ON public.po_orders(po_number);
CREATE INDEX idx_po_orders_sku_code ON public.po_orders(sku_code);
CREATE INDEX idx_po_orders_status ON public.po_orders(status);