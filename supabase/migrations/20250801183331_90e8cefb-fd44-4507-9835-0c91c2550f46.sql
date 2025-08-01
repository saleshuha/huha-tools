-- Create a table for SKU costs with country-specific pricing
CREATE TABLE public.sku_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sku TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UAE',
  cost NUMERIC NOT NULL CHECK (cost >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sku, country)
);

-- Enable Row Level Security
ALTER TABLE public.sku_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own SKU costs" 
ON public.sku_costs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SKU costs" 
ON public.sku_costs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SKU costs" 
ON public.sku_costs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SKU costs" 
ON public.sku_costs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sku_costs_updated_at
BEFORE UPDATE ON public.sku_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sku_costs_user_country ON public.sku_costs(user_id, country);
CREATE INDEX idx_sku_costs_sku ON public.sku_costs(sku);