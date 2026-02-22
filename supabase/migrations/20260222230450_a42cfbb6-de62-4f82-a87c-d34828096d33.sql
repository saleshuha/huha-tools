
-- Allow unauthenticated users to update items on active purchase links (public portal)
CREATE POLICY "Public can update active link items"
ON public.market_purchase_links
FOR UPDATE
USING (is_active = true)
WITH CHECK (is_active = true);

-- Allow unauthenticated users to insert/update market_item_costs (from public portal)
CREATE POLICY "Public can upsert item costs"
ON public.market_item_costs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update item costs"
ON public.market_item_costs
FOR UPDATE
USING (true);
