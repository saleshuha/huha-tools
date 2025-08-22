
  -- 1) Automation configs: per-user, per-site saved selectors/settings
  CREATE TABLE IF NOT EXISTS public.automation_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT,
    site_origin TEXT NOT NULL, -- e.g., https://noon.partners
    fields JSONB NOT NULL DEFAULT '{}'::jsonb, -- { usernameField, passwordField, loginButton, fileInput, uploadButton, ... }
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;

  -- Users manage only their own configs
  CREATE POLICY "automation_configs_select_own"
    ON public.automation_configs FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "automation_configs_insert_own"
    ON public.automation_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "automation_configs_update_own"
    ON public.automation_configs FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "automation_configs_delete_own"
    ON public.automation_configs FOR DELETE
    USING (auth.uid() = user_id);

  -- Optional admin read-all (matches existing admin pattern on profiles)
  CREATE POLICY "automation_configs_admin_read_all"
    ON public.automation_configs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );

  -- Indexes and updated_at trigger
  CREATE INDEX IF NOT EXISTS automation_configs_user_site_idx
    ON public.automation_configs (user_id, site_origin);

  CREATE INDEX IF NOT EXISTS automation_configs_fields_gin
    ON public.automation_configs USING GIN (fields);

  CREATE TRIGGER trg_automation_configs_updated_at
    BEFORE UPDATE ON public.automation_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

  -- 2) Capture events: every element the picker captures
  CREATE TABLE IF NOT EXISTS public.automation_capture_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    config_id UUID REFERENCES public.automation_configs(id) ON DELETE SET NULL,
    site_url TEXT,
    site_origin TEXT,
    css TEXT,
    xpath TEXT,
    tag TEXT,
    inner_text TEXT,
    attributes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  ALTER TABLE public.automation_capture_events ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "automation_capture_events_select_own"
    ON public.automation_capture_events FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "automation_capture_events_insert_own"
    ON public.automation_capture_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  -- Optional admin read-all
  CREATE POLICY "automation_capture_events_admin_read_all"
    ON public.automation_capture_events FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );

  CREATE INDEX IF NOT EXISTS automation_capture_events_user_created_idx
    ON public.automation_capture_events (user_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS automation_capture_events_site_idx
    ON public.automation_capture_events (site_origin);

  -- 3) Automation runs: record steps/results of execution initiated from the app
  CREATE TABLE IF NOT EXISTS public.automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    config_id UUID REFERENCES public.automation_configs(id) ON DELETE SET NULL,
    site_origin TEXT,
    status TEXT NOT NULL DEFAULT 'queued', -- queued|running|success|error
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    result JSONB, -- any outputs/metadata
    error TEXT
  );

  ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "automation_runs_select_own"
    ON public.automation_runs FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "automation_runs_insert_own"
    ON public.automation_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "automation_runs_update_own"
    ON public.automation_runs FOR UPDATE
    USING (auth.uid() = user_id);

  -- Optional admin read-all
  CREATE POLICY "automation_runs_admin_read_all"
    ON public.automation_runs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );

  CREATE INDEX IF NOT EXISTS automation_runs_user_started_idx
    ON public.automation_runs (user_id, started_at DESC);

  CREATE INDEX IF NOT EXISTS automation_runs_site_idx
    ON public.automation_runs (site_origin);
  