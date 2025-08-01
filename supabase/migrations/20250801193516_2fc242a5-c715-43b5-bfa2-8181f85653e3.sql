-- Add platform field to stores table to distinguish between different marketplaces
ALTER TABLE public.stores 
ADD COLUMN platform TEXT DEFAULT 'carrefour';

-- Update existing stores to be marked as carrefour stores
UPDATE public.stores 
SET platform = 'carrefour' 
WHERE platform IS NULL;

-- Make platform field not null
ALTER TABLE public.stores 
ALTER COLUMN platform SET NOT NULL;

-- Create index for better performance when filtering by platform
CREATE INDEX idx_stores_platform_country ON public.stores(platform, country);