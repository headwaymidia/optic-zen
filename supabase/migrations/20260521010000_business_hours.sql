-- Horário comercial da loja para cálculo correto de velocidade de atendimento
alter table public.stores
  add column if not exists business_hours_start int not null default 8,   -- hora de abertura (8 = 8h)
  add column if not exists business_hours_end   int not null default 18,  -- hora de fechamento (18 = 18h)
  add column if not exists business_days        int[] not null default '{1,2,3,4,5,6}'; -- 0=dom,1=seg...6=sab
