
-- 1) background_tasks: create or align schema to support queued/failed statuses

-- Create table if missing (keeps existing table when present)
create table if not exists public.background_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  status text not null default 'queued',
  progress integer default 0,
  processed_items integer default 0,
  total_items integer default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

-- Ensure required columns exist (idempotent)
alter table public.background_tasks
  add column if not exists progress integer default 0,
  add column if not exists processed_items integer default 0,
  add column if not exists total_items integer default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz null;

-- Drop any foreign key constraints to auth.users (we avoid FKs to auth.* per best practices)
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'background_tasks'
      and c.contype = 'f'
  loop
    execute format('alter table public.background_tasks drop constraint %I', r.conname);
  end loop;
end$$;

-- Make sure status default is 'queued'
alter table public.background_tasks
  alter column status set default 'queued';

-- Replace any status CHECK constraints to allow the new values
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'background_tasks'
      and c.contype = 'c'
  loop
    execute format('alter table public.background_tasks drop constraint %I', r.conname);
  end loop;

  -- Add a permissive, explicit check
  execute $sql$
    alter table public.background_tasks
      add constraint background_tasks_status_check
      check (status in ('queued','processing','completed','failed','cancelled'))
  $sql$;
end$$;

-- Keep updated_at fresh
drop trigger if exists trg_background_tasks_updated_at on public.background_tasks;
create trigger trg_background_tasks_updated_at
before update on public.background_tasks
for each row
execute function public.set_updated_at();

-- RLS
alter table public.background_tasks enable row level security;

drop policy if exists "Users can view their background tasks" on public.background_tasks;
create policy "Users can view their background tasks"
  on public.background_tasks
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their background tasks" on public.background_tasks;
create policy "Users can create their background tasks"
  on public.background_tasks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their background tasks" on public.background_tasks;
create policy "Users can update their background tasks"
  on public.background_tasks
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their background tasks" on public.background_tasks;
create policy "Users can delete their background tasks"
  on public.background_tasks
  for delete
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_background_tasks_user_created
  on public.background_tasks (user_id, created_at desc);
create index if not exists idx_background_tasks_status
  on public.background_tasks (status);

-- 2) export_history: create (or align) with RLS

create table if not exists public.export_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  background_task_id uuid null,
  export_type text not null,
  filters jsonb not null default '{}'::jsonb,
  total_items integer default 0,
  status text not null default 'queued',
  file_path text null,
  file_size bigint null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK is optional and safe to set to public table only
do $$
begin
  -- only add FK if column exists and no existing FK
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='export_history' and column_name='background_task_id'
  ) then
    begin
      alter table public.export_history
        drop constraint if exists export_history_background_task_id_fkey;
      alter table public.export_history
        add constraint export_history_background_task_id_fkey
        foreign key (background_task_id)
        references public.background_tasks(id)
        on delete set null;
    exception when others then
      -- ignore if cannot add, the column still works without FK
      null;
    end;
  end if;
end$$;

-- updated_at trigger
drop trigger if exists trg_export_history_updated_at on public.export_history;
create trigger trg_export_history_updated_at
before update on public.export_history
for each row
execute function public.set_updated_at();

-- indexes
create index if not exists idx_export_history_user_created
  on public.export_history (user_id, created_at desc);
create index if not exists idx_export_history_task
  on public.export_history (background_task_id);

-- RLS
alter table public.export_history enable row level security;

drop policy if exists "Users can view their export history" on public.export_history;
create policy "Users can view their export history"
  on public.export_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their export history" on public.export_history;
create policy "Users can create their export history"
  on public.export_history
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their export history" on public.export_history;
create policy "Users can update their export history"
  on public.export_history
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their export history" on public.export_history;
create policy "Users can delete their export history"
  on public.export_history
  for delete
  using (auth.uid() = user_id);

-- 3) Storage: ensure private 'exports' bucket and owner-only access

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

-- Read: only own files under exports/{auth.uid()}/...
drop policy if exists "exports_read_own" on storage.objects;
create policy "exports_read_own"
  on storage.objects
  for select
  using (
    bucket_id = 'exports'
    and (name like (auth.uid()::text || '/%'))
  );

-- Insert: only into own folder
drop policy if exists "exports_insert_own" on storage.objects;
create policy "exports_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'exports'
    and (name like (auth.uid()::text || '/%'))
  );

-- Update: only own files
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

-- Delete: only own files
drop policy if exists "exports_delete_own" on storage.objects;
create policy "exports_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'exports'
    and (name like (auth.uid()::text || '/%'))
  );
