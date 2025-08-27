-- Ensure background_tasks table has all required columns for task persistence
DO $$ 
BEGIN
  -- Check if the table exists and has all required columns
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'background_tasks' 
    AND column_name = 'metadata'
    AND table_schema = 'public'
  ) THEN
    -- Add metadata column if it doesn't exist
    ALTER TABLE public.background_tasks 
    ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Ensure completed_at column exists
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'background_tasks' 
    AND column_name = 'completed_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.background_tasks 
    ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
  END IF;

  -- Add index for efficient querying of active and recent tasks
  CREATE INDEX IF NOT EXISTS idx_background_tasks_user_status_created 
  ON public.background_tasks (user_id, status, created_at DESC);

  -- Add index for completed_at queries
  CREATE INDEX IF NOT EXISTS idx_background_tasks_completed_at 
  ON public.background_tasks (completed_at DESC) 
  WHERE completed_at IS NOT NULL;
END $$;