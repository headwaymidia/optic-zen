-- Rastreamento de anúncios Click-to-WhatsApp
alter table public.leads
  add column if not exists ctwa_clid text,        -- parâmetro de rastreamento do Meta
  add column if not exists ad_source text,         -- origem do anúncio (ex: "instagram", "facebook")
  add column if not exists ad_creative_name text;  -- nome do criativo do anúncio

create index if not exists idx_leads_ctwa_clid on public.leads(ctwa_clid) where ctwa_clid is not null;
