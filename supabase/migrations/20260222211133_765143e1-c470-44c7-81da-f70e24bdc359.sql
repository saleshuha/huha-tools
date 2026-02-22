
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
    
    UNION ALL
    
    -- From noon_orders table using partner_sku matched to item SKU via a join approach
    -- Match by ASIN field directly isn't possible, so we match noon partner_sku to provide images
    -- for items that don't have product_images entries
    SELECT unnest_asin AS asin,
           'https://z.nooncdn.com/tr:n-t_400/' || no.image_key || '.jpg' AS image_url,
           2 as priority
    FROM public.noon_orders no
    CROSS JOIN unnest(p_asins) AS unnest_asin
    WHERE no.user_id = p_user_id
      AND no.image_key IS NOT NULL
      AND no.image_key != ''
      AND no.partner_sku IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.market_purchase_links mpl
        WHERE mpl.user_id = p_user_id
        AND mpl.items::jsonb @> jsonb_build_array(jsonb_build_object('asin', unnest_asin, 'sku', no.partner_sku))
      )
  ) combined
  ORDER BY combined.asin, combined.priority;
$$;
