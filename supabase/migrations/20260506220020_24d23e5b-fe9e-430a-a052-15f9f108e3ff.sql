CREATE TABLE public.prescriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  od_esferico text,
  od_cilindrico text,
  od_eixo text,
  oe_esferico text,
  oe_cilindrico text,
  oe_eixo text,
  adicao text,
  dnp text,
  created_by uuid
);

CREATE INDEX idx_prescriptions_lead_id ON public.prescriptions(lead_id, created_at DESC);
CREATE INDEX idx_prescriptions_store_id ON public.prescriptions(store_id);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescriptions_select" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));

CREATE POLICY "prescriptions_insert" ON public.prescriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id, auth.uid()));

CREATE POLICY "prescriptions_update" ON public.prescriptions
  FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));

CREATE POLICY "prescriptions_delete" ON public.prescriptions
  FOR DELETE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));