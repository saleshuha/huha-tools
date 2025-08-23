
-- 1) Orders table to persist Sunsky orders per user
create table if not exists public.sunsky_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  number text not null unique, -- Sunsky order number
  status text,
  site_number text,
  gmt_created timestamptz,
  total numeric,
  currency text,
  shipping_company text,
  tracking_number text,
  tracking_url text,
  raw jsonb, -- full response snapshot for future-proofing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Items table for per-order line items
create table if not exists public.sunsky_order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_number text not null references public.sunsky_orders(number) on delete cascade,
  sku_code text,
  model_number text,
  title text,
  quantity int,
  unit_price numeric,
  currency text,
  asin text,
  raw jsonb,
  created_at timestamptz not null default now()
);

-- Useful indexes
create index if not exists sunsky_orders_user_id_idx on public.sunsky_orders(user_id);
create index if not exists sunsky_orders_number_idx on public.sunsky_orders(number);
create index if not exists sunsky_order_items_user_id_idx on public.sunsky_order_items(user_id);
create index if not exists sunsky_order_items_order_number_idx on public.sunsky_order_items(order_number);

-- Trigger to keep updated_at current
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sunsky_orders_updated_at on public.sunsky_orders;
create trigger trg_sunsky_orders_updated_at
before update on public.sunsky_orders
for each row execute procedure public.set_updated_at();

-- Enable Row Level Security
alter table public.sunsky_orders enable row level security;
alter table public.sunsky_order_items enable row level security;

-- RLS Policies: users can only access their own records
drop policy if exists "sunsky_orders_select_own" on public.sunsky_orders;
create policy "sunsky_orders_select_own"
  on public.sunsky_orders for select
  using (auth.uid() = user_id);

drop policy if exists "sunsky_orders_insert_own" on public.sunsky_orders;
create policy "sunsky_orders_insert_own"
  on public.sunsky_orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "sunsky_orders_update_own" on public.sunsky_orders;
create policy "sunsky_orders_update_own"
  on public.sunsky_orders for update
  using (auth.uid() = user_id);

drop policy if exists "sunsky_orders_delete_own" on public.sunsky_orders;
create policy "sunsky_orders_delete_own"
  on public.sunsky_orders for delete
  using (auth.uid() = user_id);

drop policy if exists "sunsky_order_items_select_own" on public.sunsky_order_items;
create policy "sunsky_order_items_select_own"
  on public.sunsky_order_items for select
  using (auth.uid() = user_id);

drop policy if exists "sunsky_order_items_insert_own" on public.sunsky_order_items;
create policy "sunsky_order_items_insert_own"
  on public.sunsky_order_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "sunsky_order_items_update_own" on public.sunsky_order_items;
create policy "sunsky_order_items_update_own"
  on public.sunsky_order_items for update
  using (auth.uid() = user_id);

drop policy if exists "sunsky_order_items_delete_own" on public.sunsky_order_items;
create policy "sunsky_order_items_delete_own"
  on public.sunsky_order_items for delete
  using (auth.uid() = user_id);
