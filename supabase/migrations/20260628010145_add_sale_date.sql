-- Adiciona sale_date: marca o MOMENTO REAL da venda (quando o lead vira "Compareceu e Comprou").
-- Sem backfill: vendas antigas ficam NULL (o grafico usa updated_at como fallback so pra elas).
-- Vendas novas, a partir de agora, gravam sale_date preciso.

alter table public.leads
  add column if not exists sale_date timestamptz;

-- indice para o grafico de evolucao filtrar por periodo de venda com eficiencia
create index if not exists leads_sale_date_idx
  on public.leads (store_id, sale_date)
  where sale_date is not null;
