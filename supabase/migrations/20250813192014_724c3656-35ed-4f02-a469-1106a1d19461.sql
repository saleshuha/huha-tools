-- Create warehouses table for permanent storage
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Create policies for warehouse access
CREATE POLICY "Users can view their own warehouses" 
ON public.warehouses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own warehouses" 
ON public.warehouses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own warehouses" 
ON public.warehouses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warehouses" 
ON public.warehouses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at column
CREATE TRIGGER update_warehouses_updated_at
BEFORE UPDATE ON public.warehouses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default warehouse for existing users
INSERT INTO public.warehouses (user_id, code, name, is_default)
SELECT DISTINCT p.id, 'WH001', 'Main Warehouse', true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.warehouses w WHERE w.user_id = p.id
);