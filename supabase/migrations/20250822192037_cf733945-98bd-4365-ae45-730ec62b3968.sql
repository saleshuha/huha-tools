-- Create saved_delivery_addresses table
CREATE TABLE public.saved_delivery_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  country_id TEXT NOT NULL,
  state TEXT DEFAULT '',
  city TEXT NOT NULL,
  company TEXT DEFAULT '',
  address TEXT NOT NULL,
  address2 TEXT DEFAULT '',
  postcode TEXT NOT NULL,
  receiver TEXT NOT NULL,
  telephone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies for saved addresses
CREATE POLICY "Users can view their own saved addresses" 
ON public.saved_delivery_addresses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved addresses" 
ON public.saved_delivery_addresses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved addresses" 
ON public.saved_delivery_addresses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved addresses" 
ON public.saved_delivery_addresses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_delivery_addresses_updated_at
BEFORE UPDATE ON public.saved_delivery_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();