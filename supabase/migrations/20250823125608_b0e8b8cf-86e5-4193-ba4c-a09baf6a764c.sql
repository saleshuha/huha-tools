
-- 1) Roles table
create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.app_roles enable row level security;

-- Admins can manage roles
create policy if not exists "Admins manage roles"
  on public.app_roles
  for all
  using (is_user_admin(auth.uid()))
  with check (is_user_admin(auth.uid()));

-- Anyone authenticated can view roles (safe metadata)
create policy if not exists "Anyone can view roles"
  on public.app_roles
  for select
  using (true);

-- 2) Permissions table
create table if not exists public.app_permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.app_permissions enable row level security;

-- Admins can manage permissions
create policy if not exists "Admins manage permissions"
  on public.app_permissions
  for all
  using (is_user_admin(auth.uid()))
  with check (is_user_admin(auth.uid()));

-- Anyone authenticated can view permissions (safe metadata)
create policy if not exists "Anyone can view permissions"
  on public.app_permissions
  for select
  using (true);

-- 3) Role-to-permission mapping
create table if not exists public.role_permissions (
  role_id uuid not null references public.app_roles(id) on delete cascade,
  permission_id uuid not null references public.app_permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

alter table public.role_permissions enable row level security;

-- Admins can manage role-permissions
create policy if not exists "Admins manage role-permissions"
  on public.role_permissions
  for all
  using (is_user_admin(auth.uid()))
  with check (is_user_admin(auth.uid()));

-- Admins can view role-permissions
create policy if not exists "Admins can view role-permissions"
  on public.role_permissions
  for select
  using (is_user_admin(auth.uid()));

-- 4) User-to-role mapping
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.app_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

alter table public.user_roles enable row level security;

-- Admins can manage user-roles
create policy if not exists "Admins manage user-roles"
  on public.user_roles
  for all
  using (is_user_admin(auth.uid()))
  with check (is_user_admin(auth.uid()));

-- Users can view their own roles
create policy if not exists "Users view own roles"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

-- 5) User-to-permission overrides (direct grants)
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_id uuid not null references public.app_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, permission_id)
);

alter table public.user_permissions enable row level security;

-- Admins can manage user-permissions
create policy if not exists "Admins manage user-permissions"
  on public.user_permissions
  for all
  using (is_user_admin(auth.uid()))
  with check (is_user_admin(auth.uid()));

-- Users can view their own direct permissions
create policy if not exists "Users view own direct permissions"
  on public.user_permissions
  for select
  using (auth.uid() = user_id);

-- 6) Helper functions

-- Has role
create or replace function public.has_role(_user_id uuid, _role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.app_roles r on r.id = ur.role_id
    where ur.user_id = _user_id
      and r.name = _role_name
  );
$$;

-- Has permission (via direct grant or via roles)
create or replace function public.has_permission(_user_id uuid, _perm_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with direct as (
    select 1
    from public.user_permissions up
    join public.app_permissions p on p.id = up.permission_id
    where up.user_id = _user_id and p.key = _perm_key
    limit 1
  ),
  via_roles as (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.app_permissions p on p.id = rp.permission_id
    where ur.user_id = _user_id and p.key = _perm_key
    limit 1
  )
  select exists(select * from direct) or exists(select * from via_roles);
$$;

-- Effective permissions list for a user
create or replace function public.get_effective_permissions(_user_id uuid)
returns table(permission_key text)
language sql
stable
security definer
set search_path = public
as $$
  (
    select distinct p.key
    from public.user_permissions up
    join public.app_permissions p on p.id = up.permission_id
    where up.user_id = _user_id
  )
  union
  (
    select distinct p.key
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.app_permissions p on p.id = rp.permission_id
    where ur.user_id = _user_id
  );
$$;

-- 7) Seed roles
insert into public.app_roles (name, description) values
  ('admin', 'Full access to all pages and actions'),
  ('manager', 'Manage data and routine operations'),
  ('staff', 'Standard operational access'),
  ('viewer', 'Read-only access')
on conflict (name) do nothing;

-- 8) Seed permissions (pages and actions you can expand later)
insert into public.app_permissions (key, label, description) values
  -- Pages
  ('page:user_management', 'User Management Page', 'Access the User Management page'),
  ('page:inventory', 'Inventory Page', 'Access inventory pages'),
  ('page:po_tracker', 'PO Tracker Page', 'Access purchase order tracking'),
  ('page:sunsky_order_tracking', 'Sunsky Order Tracking Page', 'Access Sunsky order tracking'),
  ('page:noon_dashboard', 'Noon Dashboard', 'Access Noon dashboards'),
  ('page:noon_analytics', 'Noon Analytics', 'Access Noon analytics'),
  ('page:vendors', 'Vendors', 'Access vendor integrations'),
  ('page:payments', 'Payments', 'Access payment reports'),
  -- User actions
  ('action:user:create', 'Create Users', 'Create/invite users'),
  ('action:user:update', 'Update Users', 'Edit users and their details'),
  ('action:user:delete', 'Delete Users', 'Delete user accounts'),
  -- Inventory actions
  ('action:inventory:edit', 'Edit Inventory', 'Modify inventory quantities and data'),
  ('action:inventory:delete', 'Delete Inventory', 'Delete inventory items'),
  -- PO actions
  ('action:po:upload', 'Upload POs', 'Upload purchase orders'),
  ('action:po:update', 'Update POs', 'Edit purchase orders'),
  ('action:po:delete', 'Delete POs', 'Delete purchase orders'),
  -- Orders/actions
  ('action:orders:import', 'Import Orders', 'Import orders from files/APIs'),
  ('action:orders:delete', 'Delete Orders', 'Delete order records'),
  -- Settings
  ('action:settings:edit', 'Edit Settings', 'Change global app settings')
on conflict (key) do nothing;

-- 9) Grant admin role all permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.app_roles r
cross join public.app_permissions p
where r.name = 'admin'
on conflict do nothing;

-- 10) Assign admin role to all existing admin profiles (backwards compatible)
insert into public.user_roles (user_id, role_id)
select p.id as user_id, r.id as role_id
from public.profiles p
join public.app_roles r on r.name = 'admin'
where p.role = 'admin'
on conflict do nothing;

-- Helpful indexes
create index if not exists idx_app_permissions_key on public.app_permissions(key);
create index if not exists idx_app_roles_name on public.app_roles(name);
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_user_permissions_user on public.user_permissions(user_id);
