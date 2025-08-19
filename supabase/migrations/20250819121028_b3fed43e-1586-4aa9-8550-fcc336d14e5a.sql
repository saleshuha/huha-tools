
-- Create a secure per-user store for Sunsky API credentials
CREATE TABLE IF NOT EXISTS public.sunsky_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sunsky_credentials_user_unique UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.sunsky_credentials ENABLE ROW LEVEL SECURITY;

-- Only the owner can read their credentials
CREATE POLICY "Users can view their own Sunsky credentials"
  ON public.sunsky_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only the owner can insert their credentials
CREATE POLICY "Users can create their own Sunsky credentials"
  ON public.sunsky_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their credentials
CREATE POLICY "Users can update their own Sunsky credentials"
  ON public.sunsky_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Only the owner can delete their credentials
CREATE POLICY "Users can delete their own Sunsky credentials"
  ON public.sunsky_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Keep updated_at current
CREATE TRIGGER update_sunsky_credentials_updated_at
BEFORE UPDATE ON public.sunsky_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
