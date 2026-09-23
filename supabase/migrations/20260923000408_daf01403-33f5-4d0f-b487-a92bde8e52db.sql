ALTER TABLE public.delta_sync_config
  ADD COLUMN IF NOT EXISTS identifier_mode TEXT NOT NULL DEFAULT 'asin';