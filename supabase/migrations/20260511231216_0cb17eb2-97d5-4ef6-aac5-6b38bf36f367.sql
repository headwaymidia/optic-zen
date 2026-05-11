CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  instance_name text,
  remote_jid text,
  message_id text,
  from_me boolean NOT NULL DEFAULT false,
  body text,
  media_type text,
  media_url text,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id_timestamp
  ON public.whatsapp_messages (lead_id, "timestamp" ASC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_store_id
  ON public.whatsapp_messages (store_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_messages_instance_message
  ON public.whatsapp_messages (instance_name, message_id)
  WHERE message_id IS NOT NULL;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_msg_select"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));

CREATE POLICY "wa_msg_insert"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id, auth.uid()));

CREATE POLICY "wa_msg_update"
  ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));

CREATE POLICY "wa_msg_delete"
  ON public.whatsapp_messages FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono'::text, 'Gerente'::text]));

ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;