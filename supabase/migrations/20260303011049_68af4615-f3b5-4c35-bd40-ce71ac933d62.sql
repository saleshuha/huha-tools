
-- Shopify config table to store credentials per user
CREATE TABLE public.shopify_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_domain TEXT NOT NULL,
  api_token TEXT NOT NULL,
  location_id TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.shopify_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopify config"
  ON public.shopify_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopify config"
  ON public.shopify_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopify config"
  ON public.shopify_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopify config"
  ON public.shopify_config FOR DELETE
  USING (auth.uid() = user_id);

-- Shopify sync log table for audit trail
CREATE TABLE public.shopify_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sku TEXT NOT NULL,
  title TEXT,
  local_quantity INTEGER NOT NULL,
  shopify_quantity INTEGER,
  new_quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopify_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
  ON public.shopify_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs"
  ON public.shopify_sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_shopify_sync_log_user_id ON public.shopify_sync_log(user_id);
CREATE INDEX idx_shopify_sync_log_synced_at ON public.shopify_sync_log(synced_at DESC);

-- Trigger for updated_at on shopify_config
CREATE TRIGGER update_shopify_config_updated_at
  BEFORE UPDATE ON public.shopify_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
