
-- Create a public function to get product images for market purchase links
CREATE OR REPLACE FUNCTION public.get_product_images_for_asins(p_user_id uuid, p_asins text[])
RETURNS TABLE(asin text, image_url text) 
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT DISTINCT ON (pi.asin) pi.asin, pi.image_url
  FROM public.product_images pi
  WHERE pi.user_id = p_user_id
    AND pi.asin = ANY(p_asins);
$$;
