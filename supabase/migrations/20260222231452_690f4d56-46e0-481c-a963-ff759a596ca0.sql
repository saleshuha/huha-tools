
-- Allow public SELECT on market_item_costs so upsert conflict detection works from the portal
CREATE POLICY "Public can read item costs"
ON public.market_item_costs
FOR SELECT
USING (true);
