-- Create sunsky_credentials table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sunsky_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sunsky_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for sunsky_credentials (drop first if exists)
DROP POLICY IF EXISTS "Users can manage their own credentials" ON public.sunsky_credentials;
CREATE POLICY "Users can manage their own credentials" 
ON public.sunsky_credentials 
FOR ALL 
USING (auth.uid() = user_id);

-- Create sunsky_skus table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sunsky_skus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sku_code TEXT NOT NULL,
  title TEXT,
  cost NUMERIC,
  weight NUMERIC,
  currency TEXT DEFAULT 'USD',
  country TEXT NOT NULL DEFAULT 'UAE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sunsky_skus ENABLE ROW LEVEL SECURITY;

-- Create policies for sunsky_skus (drop first if exists)
DROP POLICY IF EXISTS "Users can view their own SKUs" ON public.sunsky_skus;
DROP POLICY IF EXISTS "Users can create their own SKUs" ON public.sunsky_skus;
DROP POLICY IF EXISTS "Users can update their own SKUs" ON public.sunsky_skus;
DROP POLICY IF EXISTS "Users can delete their own SKUs" ON public.sunsky_skus;

CREATE POLICY "Users can view their own SKUs" 
ON public.sunsky_skus 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SKUs" 
ON public.sunsky_skus 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SKUs" 
ON public.sunsky_skus 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SKUs" 
ON public.sunsky_skus 
FOR DELETE 
USING (auth.uid() = user_id);