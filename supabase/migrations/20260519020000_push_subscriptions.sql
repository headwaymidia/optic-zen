create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  store_id    uuid not null references public.stores(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  unique(user_id, store_id, endpoint)
);

create index if not exists push_subscriptions_store_id_idx on public.push_subscriptions(store_id);

alter table public.push_subscriptions enable row level security;

-- Usuário só pode ver/gerenciar suas próprias subscrições
create policy "users_manage_own_subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid());
