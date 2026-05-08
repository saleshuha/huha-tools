CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'delta-sync-push-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/delta-sync-push',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM"}'::jsonb,
    body := '{"mode":"auto"}'::jsonb
  ) AS request_id;
  $$
);