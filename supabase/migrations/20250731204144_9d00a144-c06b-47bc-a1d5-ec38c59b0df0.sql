-- Create stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'AED',
  country TEXT NOT NULL DEFAULT 'UAE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create policies for stores
CREATE POLICY "Users can view their own stores" 
ON public.stores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stores" 
ON public.stores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stores" 
ON public.stores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stores" 
ON public.stores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add store_id to carrefour_payments table
ALTER TABLE public.carrefour_payments 
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();