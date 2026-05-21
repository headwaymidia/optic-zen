alter table public.subscriptions
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists asaas_payment_id text;

create index if not exists idx_subscriptions_asaas_customer on public.subscriptions(asaas_customer_id);
