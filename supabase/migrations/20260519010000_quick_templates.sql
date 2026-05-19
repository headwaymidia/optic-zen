-- Tabela de templates de mensagens rápidas por loja
create table if not exists public.quick_templates (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  title       text not null,
  body        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Índice para busca por loja
create index if not exists quick_templates_store_id_idx on public.quick_templates(store_id, sort_order);

-- RLS
alter table public.quick_templates enable row level security;

-- Membros da loja podem ler
create policy "store_members_select_templates" on public.quick_templates
  for select using (
    store_id in (
      select store_id from public.store_members where user_id = auth.uid()
    )
  );

-- Donos e Gerentes podem inserir, atualizar e deletar
create policy "owners_managers_insert_templates" on public.quick_templates
  for insert with check (
    store_id in (
      select store_id from public.store_members
      where user_id = auth.uid() and role in ('Dono', 'Gerente')
    )
  );

create policy "owners_managers_update_templates" on public.quick_templates
  for update using (
    store_id in (
      select store_id from public.store_members
      where user_id = auth.uid() and role in ('Dono', 'Gerente')
    )
  );

create policy "owners_managers_delete_templates" on public.quick_templates
  for delete using (
    store_id in (
      select store_id from public.store_members
      where user_id = auth.uid() and role in ('Dono', 'Gerente')
    )
  );

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quick_templates_updated_at
  before update on public.quick_templates
  for each row execute function public.set_updated_at();

-- Templates padrão para novas lojas (inseridos via função)
-- Lojas existentes receberão templates padrão na primeira abertura do gestor
