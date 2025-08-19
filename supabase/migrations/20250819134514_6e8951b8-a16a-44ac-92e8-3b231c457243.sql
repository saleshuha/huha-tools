-- Create table to track Sunsky API usage for rate limiting
CREATE TABLE public.sunsky_api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('minute', 'day')),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  user_id UUID NULL,
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(key_hash, endpoint, period, window_start)
);

-- Enable RLS
ALTER TABLE public.sunsky_api_usage ENABLE ROW LEVEL SECURITY;

-- Create indexes for fast lookups and upserts
CREATE INDEX idx_sunsky_api_usage_lookup ON public.sunsky_api_usage(key_hash, endpoint, period, window_start);
CREATE INDEX idx_sunsky_api_usage_cleanup ON public.sunsky_api_usage(window_start);

-- No RLS policies needed as Service Role will bypass RLS in Edge Functions