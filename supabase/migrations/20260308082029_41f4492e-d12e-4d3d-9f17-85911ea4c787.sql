
CREATE TABLE public.noon_webhook_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  store_id UUID REFERENCES public.noon_stores_config(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.noon_webhook_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook keys"
  ON public.noon_webhook_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhook keys"
  ON public.noon_webhook_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhook keys"
  ON public.noon_webhook_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhook keys"
  ON public.noon_webhook_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
