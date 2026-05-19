-- 1. Adicionar retry_count e failed_at na tabela de mensagens
alter table public.whatsapp_messages
  add column if not exists retry_count int not null default 0,
  add column if not exists failed_at timestamptz;

-- Índice para o worker buscar mensagens queued eficientemente
create index if not exists idx_whatsapp_messages_queued
  on public.whatsapp_messages (store_id, status, created_at)
  where status = 'queued';

-- 2. Limpeza automática: deletar mensagens com mais de 12 meses
-- Roda via pg_cron (agendado abaixo)
create or replace function public.cleanup_old_whatsapp_messages()
returns void language plpgsql as $$
begin
  delete from public.whatsapp_messages
  where created_at < now() - interval '12 months';
end;
$$;

-- 3. Agendar limpeza mensal às 3h da manhã
select cron.schedule(
  'cleanup-whatsapp-messages',
  '0 3 1 * *',
  $$select public.cleanup_old_whatsapp_messages();$$
);
