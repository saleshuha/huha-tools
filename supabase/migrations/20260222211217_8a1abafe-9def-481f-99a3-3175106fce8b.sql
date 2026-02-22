
CREATE OR REPLACE FUNCTION public.get_product_images_for_asins(p_user_id uuid, p_asins text[])
RETURNS TABLE(asin text, image_url text) 
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (combined.asin) combined.asin, combined.image_url
  FROM (
    SELECT pi.asin, pi.image_url, 1 as priority
    FROM public.product_images pi
    WHERE pi.user_id = p_user_id
      AND pi.asin = ANY(p_asins)
  ) combined
  ORDER BY combined.asin, combined.priority;
$$;

-- New function: get images by SKU from noon_orders
CREATE OR REPLACE FUNCTION public.get_noon_images_for_skus(p_user_id uuid, p_skus text[])
RETURNS TABLE(sku text, image_url text)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (no.partner_sku) no.partner_sku AS sku,
         'https://z.nooncdn.com/tr:n-t_400/' || no.image_key || '.jpg' AS image_url
  FROM public.noon_orders no
  WHERE no.user_id = p_user_id
    AND no.partner_sku = ANY(p_skus)
    AND no.image_key IS NOT NULL
    AND no.image_key != ''
  ORDER BY no.partner_sku, no.created_at DESC;
$$;
