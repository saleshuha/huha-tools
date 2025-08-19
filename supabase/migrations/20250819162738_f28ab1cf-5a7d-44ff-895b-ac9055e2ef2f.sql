-- Check if unique constraint exists and create it if missing
ALTER TABLE public.sunsky_skus 
DROP CONSTRAINT IF EXISTS sunsky_skus_user_id_sku_code_key;

ALTER TABLE public.sunsky_skus 
ADD CONSTRAINT sunsky_skus_user_id_sku_code_key 
UNIQUE (user_id, sku_code);