-- Vendedoras da loja (sem necessidade de conta no sistema)
create table if not exists public.store_sellers (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists store_sellers_store_id_idx on public.store_sellers(store_id);

alter table public.store_sellers enable row level security;

-- Membros da loja podem ver e gerenciar vendedoras
create policy "store_sellers_select" on public.store_sellers
  for select using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = store_sellers.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "store_sellers_insert" on public.store_sellers
  for insert with check (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = store_sellers.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "store_sellers_update" on public.store_sellers
  for update using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = store_sellers.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "store_sellers_delete" on public.store_sellers
  for delete using (
    exists (
      select 1 from public.store_members sm
      where sm.store_id = store_sellers.store_id
        and sm.user_id = auth.uid()
    )
  );
