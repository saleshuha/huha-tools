-- Create carrefour_payments table with all required columns
CREATE TABLE public.carrefour_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_number TEXT NOT NULL,
  sku_number TEXT NOT NULL,
  sale_value NUMERIC(10,2) NOT NULL,
  seller_fees NUMERIC(10,2) NOT NULL,
  pending_amount NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2) NOT NULL,
  profit NUMERIC(10,2) NOT NULL,
  country TEXT NOT NULL DEFAULT 'UAE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.carrefour_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own carrefour payments" 
ON public.carrefour_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own carrefour payments" 
ON public.carrefour_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own carrefour payments" 
ON public.carrefour_payments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own carrefour payments" 
ON public.carrefour_payments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_carrefour_payments_updated_at
BEFORE UPDATE ON public.carrefour_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();