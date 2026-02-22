
CREATE OR REPLACE FUNCTION public.get_product_images_for_asins(p_user_id uuid, p_asins text[])
RETURNS TABLE(asin text, image_url text) 
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  -- First try product_images table
  SELECT DISTINCT ON (combined.asin) combined.asin, combined.image_url
  FROM (
    -- From product_images table
    SELECT pi.asin, pi.image_url, 1 as priority
    FROM public.product_images pi
    WHERE pi.user_id = p_user_id
      AND pi.asin = ANY(p_asins)
    
    UNION ALL
    
    -- From noon_orders table using image_key -> Noon CDN
    SELECT no.sku AS asin, 
           'https://z.nooncdn.com/tr:n-t_400/' || no.image_key || '.jpg' AS image_url,
           2 as priority
    FROM public.noon_orders no
    WHERE no.user_id = p_user_id
      AND no.sku = ANY(p_asins)
      AND no.image_key IS NOT NULL
      AND no.image_key != ''
  ) combined
  ORDER BY combined.asin, combined.priority;
$$;
