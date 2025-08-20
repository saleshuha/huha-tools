-- Update sunsky_credentials table to support multiple API keys
ALTER TABLE IF EXISTS public.sunsky_credentials 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS last_tested TIMESTAMP WITH TIME ZONE;

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.sunsky_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  last_tested TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sunsky_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.sunsky_credentials;
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.sunsky_credentials;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.sunsky_credentials;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.sunsky_credentials;

-- Create policies for user access
CREATE POLICY "Users can view their own API keys" 
ON public.sunsky_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" 
ON public.sunsky_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" 
ON public.sunsky_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" 
ON public.sunsky_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_sunsky_credentials_updated_at
BEFORE UPDATE ON public.sunsky_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();