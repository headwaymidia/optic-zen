CREATE TABLE public.partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  store_id uuid,
  name text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  how text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_select_own ON public.partner_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY partner_insert_own ON public.partner_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY partner_update_own ON public.partner_requests
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());