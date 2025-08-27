-- Create print_eligible_items table for managing ASIN/SKU print eligibility
CREATE TABLE public.print_eligible_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  identifier TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ASIN', 'SKU')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.print_eligible_items ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own print eligible items" 
ON public.print_eligible_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own print eligible items" 
ON public.print_eligible_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own print eligible items" 
ON public.print_eligible_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own print eligible items" 
ON public.print_eligible_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_print_eligible_items_updated_at
BEFORE UPDATE ON public.print_eligible_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create index for better performance
CREATE INDEX idx_print_eligible_items_user_id ON public.print_eligible_items(user_id);
CREATE INDEX idx_print_eligible_items_identifier ON public.print_eligible_items(identifier);
CREATE INDEX idx_print_eligible_items_active ON public.print_eligible_items(user_id, is_active) WHERE is_active = true;