
-- Config table
CREATE TABLE public.delta_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  base_url text NOT NULL DEFAULT 'https://d9498b78-e82e-48be-bd96-a064b66ce3db.lovableproject.com',
  api_key text,
  source_label text NOT NULL DEFAULT 'huha-tools',
  auto_push_enabled boolean NOT NULL DEFAULT false,
  last_pushed_at timestamptz,
  last_test_status text,
  last_test_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delta_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own delta sync config"
  ON public.delta_sync_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_delta_sync_config_updated
  BEFORE UPDATE ON public.delta_sync_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Queue table
CREATE TABLE public.delta_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asin text NOT NULL,
  delta integer NOT NULL,
  reference_id text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  balance_after integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  pushed_at timestamptz
);

CREATE INDEX idx_delta_sync_queue_pending ON public.delta_sync_queue(user_id, status, created_at);

ALTER TABLE public.delta_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own delta sync queue"
  ON public.delta_sync_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own delta sync queue"
  ON public.delta_sync_queue FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: enqueue stock_changes deltas if user has config
CREATE OR REPLACE FUNCTION public.enqueue_delta_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_config boolean;
BEGIN
  IF NEW.asin IS NULL OR NEW.change_amount = 0 THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.delta_sync_config WHERE user_id = NEW.user_id) INTO has_config;
  IF NOT has_config THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.delta_sync_queue (user_id, asin, delta, reference_id, notes)
  VALUES (
    NEW.user_id,
    upper(trim(NEW.asin)),
    GREATEST(LEAST(NEW.change_amount, 10000), -10000),
    COALESCE(NEW.reference_number, NEW.reference_id::text),
    NEW.change_reason
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_changes_delta_sync
  AFTER INSERT ON public.stock_changes
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_delta_sync();
