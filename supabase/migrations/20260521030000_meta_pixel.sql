-- Meta Pixel / Conversions API por loja
alter table public.stores
  add column if not exists meta_pixel_id text,
  add column if not exists meta_access_token text;
