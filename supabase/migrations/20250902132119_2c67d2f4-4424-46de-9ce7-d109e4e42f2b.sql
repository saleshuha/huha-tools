-- Create noon_stores table for managing Noon.com specific stores
CREATE TABLE public.noon_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  partner_id TEXT,
  country TEXT NOT NULL DEFAULT 'UAE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id, country)
);

-- Enable RLS
ALTER TABLE public.noon_stores ENABLE ROW LEVEL SECURITY;

-- Create policies for noon_stores
CREATE POLICY "Users can view their own noon stores" 
ON public.noon_stores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own noon stores" 
ON public.noon_stores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own noon stores" 
ON public.noon_stores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own noon stores" 
ON public.noon_stores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_noon_stores_updated_at
BEFORE UPDATE ON public.noon_stores
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Update noon_orders table to reference noon_stores instead
ALTER TABLE public.noon_orders 
ADD COLUMN noon_store_id UUID REFERENCES public.noon_stores(id);

-- Create index for better performance
CREATE INDEX idx_noon_stores_user_country ON public.noon_stores(user_id, country);
CREATE INDEX idx_noon_orders_noon_store_id ON public.noon_orders(noon_store_id);