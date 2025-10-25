# Export Cleanup Cron Job Setup

This file contains instructions for setting up the automated export cleanup job that runs daily.

## What It Does

The `cleanup-old-exports` edge function automatically deletes exports older than 30 days that are not marked as "keep forever". It runs daily at 2 AM UTC.

## Setup Instructions

### Step 1: Enable Required Extensions

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Create the Cron Job

Run this SQL in your Supabase SQL Editor (replace `YOUR_PROJECT_REF` and `YOUR_ANON_KEY`):

```sql
SELECT cron.schedule(
  'cleanup-old-exports-daily',
  '0 2 * * *', -- Runs daily at 2 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-old-exports',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

**Important**: Replace:
- `YOUR_PROJECT_REF` with your actual Supabase project reference (found in Project Settings > API)
- `YOUR_ANON_KEY` with your anon/public API key (found in Project Settings > API)

### Step 3: Verify the Cron Job

Check that the cron job was created successfully:

```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-exports-daily';
```

### Step 4: Test Manually (Optional)

You can trigger the cleanup manually to test it:

```sql
SELECT cron.schedule(
  'test-cleanup-once',
  '* * * * *', -- Run immediately
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-old-exports',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- After testing, remove the test job:
SELECT cron.unschedule('test-cleanup-once');
```

## Monitoring

### View Cron Job Logs

```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'cleanup-old-exports-daily'
ORDER BY start_time DESC
LIMIT 10;
```

### View Edge Function Logs

Go to Supabase Dashboard > Edge Functions > cleanup-old-exports > Logs

## Maintenance

### Temporarily Disable the Cron Job

```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'cleanup-old-exports-daily';
```

### Re-enable the Cron Job

```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'cleanup-old-exports-daily';
```

### Delete the Cron Job

```sql
SELECT cron.unschedule('cleanup-old-exports-daily');
```

### Change Schedule

To change when the job runs (e.g., to 3 AM instead of 2 AM):

```sql
SELECT cron.unschedule('cleanup-old-exports-daily');

SELECT cron.schedule(
  'cleanup-old-exports-daily',
  '0 3 * * *', -- New time: 3 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-old-exports',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

## Cron Schedule Format

The cron schedule uses standard cron syntax:
- `0 2 * * *` = Daily at 2 AM UTC
- `0 */6 * * *` = Every 6 hours
- `0 0 * * 0` = Weekly on Sunday at midnight
- `0 0 1 * *` = Monthly on the 1st at midnight

## How Exports Are Protected

Exports are automatically deleted after 30 days UNLESS:
1. They are marked as "keep forever" by the user
2. They have the `keep_forever` flag set to `true` in the database

Users can toggle the "keep forever" option in the Export History Dialog.

## Troubleshooting

### Cron job isn't running
1. Check if `pg_cron` extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Verify the job exists: `SELECT * FROM cron.job;`
3. Check job is active: `SELECT * FROM cron.job WHERE jobname = 'cleanup-old-exports-daily';`
4. Review logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Edge function returns errors
1. Check Edge Function logs in Supabase Dashboard
2. Ensure the function is deployed
3. Verify ANON_KEY is correct
4. Test the function manually via Dashboard

### Exports not being deleted
1. Check if exports have `keep_forever = true`
2. Verify exports are actually older than 30 days
3. Check Edge Function logs for errors
4. Test the cleanup function manually

## Security Notes

- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` internally to bypass RLS
- Only exports older than 30 days with `keep_forever = false` are deleted
- Files are removed from both storage and database
- The function requires no authentication (verify_jwt = false) to allow cron access
