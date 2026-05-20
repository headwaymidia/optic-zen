-- ============================================================
-- Proteção de plano no backend
-- Bloqueia operações de escrita para lojas com trial expirado
-- ou status bloqueado/inativo
-- ============================================================

-- Função helper: verifica se a loja tem plano ativo
create or replace function public.store_has_active_plan(p_store_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.subscriptions
    where store_id = p_store_id
    and (
      status = 'active'
      or (
        status = 'trial'
        and (trial_ends_at is null or trial_ends_at > now())
      )
    )
  );
$$;

-- ============================================================
-- Políticas de proteção para INSERT/UPDATE nas tabelas principais
-- Leitura (SELECT) não é bloqueada — cliente pode ver dados antigos
-- ============================================================

-- LEADS
drop policy if exists "plan_check_leads_insert" on public.leads;
create policy "plan_check_leads_insert" on public.leads
  for insert with check (
    public.store_has_active_plan(store_id)
  );

drop policy if exists "plan_check_leads_update" on public.leads;
create policy "plan_check_leads_update" on public.leads
  for update using (
    public.store_has_active_plan(store_id)
  );

-- WHATSAPP_MESSAGES (envio bloqueado, recebimento permitido)
drop policy if exists "plan_check_messages_insert" on public.whatsapp_messages;
create policy "plan_check_messages_insert" on public.whatsapp_messages
  for insert with check (
    -- Mensagens recebidas (from_me = false) sempre permitidas
    -- Envio (from_me = true) requer plano ativo
    from_me = false
    or public.store_has_active_plan(store_id)
  );

-- CONTATOS
drop policy if exists "plan_check_contatos_insert" on public.contatos;
create policy "plan_check_contatos_insert" on public.contatos
  for insert with check (
    public.store_has_active_plan(store_id)
  );

-- TAREFAS
drop policy if exists "plan_check_tarefas_insert" on public.tarefas;
create policy "plan_check_tarefas_insert" on public.tarefas
  for insert with check (
    public.store_has_active_plan(store_id)
  );

-- WHATSAPP_CONNECTIONS (conectar WhatsApp bloqueado sem plano)
drop policy if exists "plan_check_connections_insert" on public.whatsapp_connections;
create policy "plan_check_connections_insert" on public.whatsapp_connections
  for insert with check (
    public.store_has_active_plan(store_id)
  );

-- PRESCRIPTIONS
drop policy if exists "plan_check_prescriptions_insert" on public.prescriptions;
create policy "plan_check_prescriptions_insert" on public.prescriptions
  for insert with check (
    public.store_has_active_plan(store_id)
  );

-- LEAD_ACTIVITIES
drop policy if exists "plan_check_activities_insert" on public.lead_activities;
create policy "plan_check_activities_insert" on public.lead_activities
  for insert with check (
    public.store_has_active_plan(store_id)
  );

-- QUICK_TEMPLATES
drop policy if exists "plan_check_templates_insert" on public.quick_templates;
create policy "plan_check_templates_insert" on public.quick_templates
  for insert with check (
    public.store_has_active_plan(store_id)
  );
