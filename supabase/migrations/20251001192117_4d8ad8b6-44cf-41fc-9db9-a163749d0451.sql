-- Add the missing UNIQUE constraint on velocity_quantity_overrides
ALTER TABLE public.velocity_quantity_overrides
ADD CONSTRAINT velocity_quantity_overrides_user_asin_unique 
UNIQUE (user_id, asin_id);