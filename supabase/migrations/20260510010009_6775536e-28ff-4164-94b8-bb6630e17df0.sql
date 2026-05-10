CREATE TABLE public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'evolution' CHECK (provider IN ('evolution','meta')),
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connecting','connected','banned')),
  phone_number text,
  evolution_instance_name text,
  evolution_api_url text,
  evolution_api_key text,
  meta_phone_number_id text,
  meta_access_token text,
  meta_webhook_verify_token text,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_conn_select"
  ON public.whatsapp_connections
  FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));

CREATE POLICY "wa_conn_insert_admins"
  ON public.whatsapp_connections
  FOR INSERT TO authenticated
  WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

CREATE POLICY "wa_conn_update_admins"
  ON public.whatsapp_connections
  FOR UPDATE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']))
  WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

CREATE POLICY "wa_conn_delete_admins"
  ON public.whatsapp_connections
  FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

CREATE TRIGGER tg_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();