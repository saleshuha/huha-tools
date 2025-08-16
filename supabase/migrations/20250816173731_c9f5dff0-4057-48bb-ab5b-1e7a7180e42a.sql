-- Create a dedicated stores table for template stores
CREATE TABLE IF NOT EXISTS public.template_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_name)
);

-- Enable RLS
ALTER TABLE public.template_stores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create their own template stores" 
ON public.template_stores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own template stores" 
ON public.template_stores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own template stores" 
ON public.template_stores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own template stores" 
ON public.template_stores 
FOR DELETE 
USING (auth.uid() = user_id);