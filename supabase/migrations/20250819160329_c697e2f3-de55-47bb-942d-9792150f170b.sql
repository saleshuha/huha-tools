-- Create sunsky_api_usage table for rate limiting
CREATE TABLE public.sunsky_api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('minute', 'day')),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  user_id UUID REFERENCES auth.users(id),
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(key_hash, endpoint, period, window_start)
);

-- Enable RLS
ALTER TABLE public.sunsky_api_usage ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own usage data
CREATE POLICY "Users can manage their own API usage data" 
ON public.sunsky_api_usage 
FOR ALL 
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_sunsky_api_usage_lookup ON public.sunsky_api_usage(key_hash, endpoint, period, window_start);
CREATE INDEX idx_sunsky_api_usage_user_id ON public.sunsky_api_usage(user_id);
CREATE INDEX idx_sunsky_api_usage_window_start ON public.sunsky_api_usage(window_start);

-- Create trigger for updated_at
CREATE TRIGGER update_sunsky_api_usage_updated_at
BEFORE UPDATE ON public.sunsky_api_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();