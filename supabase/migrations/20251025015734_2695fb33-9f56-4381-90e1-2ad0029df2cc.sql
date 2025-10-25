-- Add keep_forever flag to export_history table
ALTER TABLE public.export_history 
ADD COLUMN IF NOT EXISTS keep_forever BOOLEAN DEFAULT false NOT NULL;

-- Add index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_export_history_cleanup 
ON public.export_history(created_at, keep_forever) 
WHERE keep_forever = false;

-- Add comment for documentation
COMMENT ON COLUMN public.export_history.keep_forever IS 'When true, export will not be auto-deleted after 30 days';