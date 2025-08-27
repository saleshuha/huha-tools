
-- 1) Export history table to persist every export attempt (in-progress, completed, failed)
create table if not exists public.export_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  background_task_id uuid null references public.background_tasks(id) on delete set null,
  export_type text not null,
  filters jsonb not null default '{}'::jsonb,
  total_items integer default 0,
  status text not null default 'queued', -- queued | processing | completed | failed | cancelled
  file_path text null,
  file_size bigint null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
drop trigger if exists trg_export_history_updated_at on public.export_history;
create trigger trg_export_history_updated_at
before update on public.export_history
for each row
execute function public.set_updated_at();

-- Indexes for fast lookups
create index if not exists idx_export_history_user_created
  on public.export_history (user_id, created_at desc);

create index if not exists idx_export_history_task
  on public.export_history (background_task_id);

-- Enable RLS
alter table public.export_history enable row level security;

-- RLS: users can view their own export history
drop policy if exists "Users can view their own export history" on public.export_history;
create policy "Users can view their own export history"
  on public.export_history
  for select
  using (auth.uid() = user_id);

-- RLS: users can insert their own export history
drop policy if exists "Users can create their own export history" on public.export_history;
create policy "Users can create their own export history"
  on public.export_history
  for insert
  with check (auth.uid() = user_id);

-- RLS: users can update their own export history
drop policy if exists "Users can update their own export history" on public.export_history;
create policy "Users can update their own export history"
  on public.export_history
  for update
  using (auth.uid() = user_id);

-- Optional: allow users to delete their own entries (usually not needed, but provided)
drop policy if exists "Users can delete their own export history" on public.export_history;
create policy "Users can delete their own export history"
  on public.export_history
  for delete
  using (auth.uid() = user_id);

-- 2) Private storage bucket for exports
insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

-- RLS policies on storage.objects for the 'exports' bucket
-- Files will be stored under 'exports/{user_id}/...'

-- Read: only allow users to read their own files
drop policy if exists "exports_read_own" on storage.objects;
create policy "exports_read_own"
  on storage.objects
  for select
  using (
    bucket_id = 'exports'
    and (name like (auth.uid()::text || '/%'))
  );

-- Insert/Upload: only into their own folder
drop policy if exists "exports_insert_own" on storage.objects;
create policy "exports_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'exports'
    and (name like (auth.uid()::text || '/%'))
  );

-- Update: allow updating metadata or overwriting only their own files
drop policy if exists "exports_update_own" on storage.objects;
create policy "exports_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'exports'
    and (name like (auth.uid()::text || '/%'))
  )
  with check (
    bucket_id = 'exports'
    and (name like (auth.uid()::text || '/%'))
  );

-- Delete: only their own files
drop policy if exists "exports_delete_own" on storage.objects;
create policy "exports_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'exports'
    and (name like (auth.uid()::text || '/%'))
  );

-- 3) Background tasks helpful index (if not present)
create index if not exists idx_background_tasks_user_created
  on public.background_tasks (user_id, created_at desc);
