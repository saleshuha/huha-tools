
-- 1) Fix schema mismatch: add description and notes to public.sunsky_skus
ALTER TABLE public.sunsky_skus
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2) Sunsky Import Jobs (queue)
CREATE TABLE IF NOT EXISTS public.sunsky_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  -- Supported types of jobs
  type TEXT NOT NULL CHECK (type IN ('category', 'brand', 'keyword', 'itemNos')),
  -- Criteria payload: e.g. { "categoryId": 123, "brandName": "nillkin", "keyword": "cable", "itemNos": ["A1","A2"], "dateFrom": "...", "dateTo": "...", "gmtModifiedStart": "..." }
  criteria JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','paused','completed','failed')),
  total_items INTEGER,
  processed_items INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  country TEXT,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS and owner-only access
ALTER TABLE public.sunsky_import_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_jobs' AND policyname='Users can view their own import jobs'
  ) THEN
    CREATE POLICY "Users can view their own import jobs"
      ON public.sunsky_import_jobs
      FOR SELECT
      TO public
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_jobs' AND policyname='Users can create their own import jobs'
  ) THEN
    CREATE POLICY "Users can create their own import jobs"
      ON public.sunsky_import_jobs
      FOR INSERT
      TO public
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_jobs' AND policyname='Users can update their own import jobs'
  ) THEN
    CREATE POLICY "Users can update their own import jobs"
      ON public.sunsky_import_jobs
      FOR UPDATE
      TO public
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_jobs' AND policyname='Users can delete their own import jobs'
  ) THEN
    CREATE POLICY "Users can delete their own import jobs"
      ON public.sunsky_import_jobs
      FOR DELETE
      TO public
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_sunsky_import_jobs_user ON public.sunsky_import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sunsky_import_jobs_status ON public.sunsky_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sunsky_import_jobs_created_at ON public.sunsky_import_jobs(created_at DESC);

-- 3) Job logs (owner-only)
CREATE TABLE IF NOT EXISTS public.sunsky_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.sunsky_import_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','warning','error')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sunsky_import_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_logs' AND policyname='Users can view their own import logs'
  ) THEN
    CREATE POLICY "Users can view their own import logs"
      ON public.sunsky_import_logs
      FOR SELECT
      TO public
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_logs' AND policyname='Users can insert their own import logs'
  ) THEN
    CREATE POLICY "Users can insert their own import logs"
      ON public.sunsky_import_logs
      FOR INSERT
      TO public
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_sunsky_import_logs_job ON public.sunsky_import_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_sunsky_import_logs_user ON public.sunsky_import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sunsky_import_logs_created_at ON public.sunsky_import_logs(created_at DESC);

-- 4) Job items (each SKU in a job)
CREATE TABLE IF NOT EXISTS public.sunsky_import_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.sunsky_import_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  item_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed','skipped')),
  sku_id UUID REFERENCES public.sunsky_skus(id),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sunsky_import_job_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_job_items' AND policyname='Users can view their own import job items'
  ) THEN
    CREATE POLICY "Users can view their own import job items"
      ON public.sunsky_import_job_items
      FOR SELECT
      TO public
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_job_items' AND policyname='Users can insert their own import job items'
  ) THEN
    CREATE POLICY "Users can insert their own import job items"
      ON public.sunsky_import_job_items
      FOR INSERT
      TO public
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sunsky_import_job_items' AND policyname='Users can update their own import job items'
  ) THEN
    CREATE POLICY "Users can update their own import job items"
      ON public.sunsky_import_job_items
      FOR UPDATE
      TO public
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Uniqueness and performance
CREATE UNIQUE INDEX IF NOT EXISTS uq_sunsky_import_job_items_job_item_no ON public.sunsky_import_job_items(job_id, item_no);
CREATE INDEX IF NOT EXISTS idx_sunsky_import_job_items_job ON public.sunsky_import_job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_sunsky_import_job_items_user ON public.sunsky_import_job_items(user_id);

-- Keep updated_at fresh on updates
CREATE TRIGGER IF NOT EXISTS update_sunsky_import_job_items_updated_at
BEFORE UPDATE ON public.sunsky_import_job_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
