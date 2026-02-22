
CREATE OR REPLACE FUNCTION public.get_product_images_for_asins(p_user_id uuid, p_asins text[])
RETURNS TABLE(asin text, image_url text) 
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (combined.asin) combined.asin, combined.image_url
  FROM (
    -- From product_images table (priority 1)
    SELECT pi.asin, pi.image_url, 1 as priority
    FROM public.product_images pi
    WHERE pi.user_id = p_user_id
      AND pi.asin = ANY(p_asins)
  ) combined
  ORDER BY combined.asin, combined.priority;
$$;
