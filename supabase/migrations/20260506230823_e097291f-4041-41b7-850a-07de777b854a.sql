CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'pro',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subs_select ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));
CREATE POLICY subs_insert ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id, auth.uid()));
CREATE POLICY subs_update ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));
CREATE POLICY subs_delete ON public.subscriptions FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono'::text]));

CREATE TRIGGER trg_subs_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_create_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (store_id, plan, billing_cycle, status, trial_ends_at)
  VALUES (NEW.id, 'pro', 'monthly', 'trial', now() + INTERVAL '14 days')
  ON CONFLICT (store_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stores_create_trial
  AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.tg_create_trial_subscription();

-- Backfill para lojas já existentes
INSERT INTO public.subscriptions (store_id, plan, billing_cycle, status, trial_ends_at)
SELECT s.id, 'pro', 'monthly', 'trial', now() + INTERVAL '14 days'
FROM public.stores s
LEFT JOIN public.subscriptions sub ON sub.store_id = s.id
WHERE sub.id IS NULL;