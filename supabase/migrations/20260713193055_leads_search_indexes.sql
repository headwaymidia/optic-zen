-- Busca de leads por nome/telefone: antes filtrava so os 50 leads carregados em
-- memoria, entao conversas antigas "sumiam" (vendedora nao achava pelo nome nem
-- pelo numero). Agora a busca vai ao banco -> precisa de indice para ser rapida.
-- pg_trgm permite ILIKE '%termo%' usar indice (busca parcial).
create extension if not exists pg_trgm;
create index concurrently if not exists idx_leads_name_trgm
  on public.leads using gin (name gin_trgm_ops);
create index concurrently if not exists idx_leads_phone_trgm
  on public.leads using gin (phone gin_trgm_ops);
