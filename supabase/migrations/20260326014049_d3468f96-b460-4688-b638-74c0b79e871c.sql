-- External sync configuration per user
CREATE TABLE public.external_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url text NOT NULL DEFAULT 'https://crcrrejwzouyysadrrpv.supabase.co/functions/v1/product-sync',
  sync_enabled boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.external_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sync config"
  ON public.external_sync_config FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- External sync operation log
CREATE TABLE public.external_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  items_count integer DEFAULT 0,
  error_message text,
  payload jsonb,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sync logs"
  ON public.external_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sync logs"
  ON public.external_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);