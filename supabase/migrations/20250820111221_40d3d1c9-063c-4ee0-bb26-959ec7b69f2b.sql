-- Add unique constraint to prevent duplicate SKUs per user
ALTER TABLE public.sunsky_skus ADD CONSTRAINT sunsky_skus_user_sku_unique UNIQUE (user_id, sku_code);