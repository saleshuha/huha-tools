-- Add country column to sunsky_skus table
ALTER TABLE public.sunsky_skus 
ADD COLUMN country TEXT CHECK (country IN ('UAE', 'KSA'));

-- Set a default country for existing records (UAE)
UPDATE public.sunsky_skus 
SET country = 'UAE' 
WHERE country IS NULL;

-- Make country column not null
ALTER TABLE public.sunsky_skus 
ALTER COLUMN country SET NOT NULL;

-- Add index on country for better performance
CREATE INDEX idx_sunsky_skus_country ON public.sunsky_skus(country);
CREATE INDEX idx_sunsky_skus_user_country ON public.sunsky_skus(user_id, country);

-- Add index on po_orders country column for better performance
CREATE INDEX IF NOT EXISTS idx_po_orders_country ON public.po_orders(country);
CREATE INDEX IF NOT EXISTS idx_po_orders_user_country ON public.po_orders(user_id, country);