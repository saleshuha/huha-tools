-- Fix stuck import jobs that are marked as in_progress but should be failed
UPDATE sunsky_import_jobs
SET 
  status = 'failed',
  completed_at = NOW(),
  last_error = 'Job was stuck in progress, marked as failed during bug fix'
WHERE status = 'in_progress' 
AND completed_at IS NULL;