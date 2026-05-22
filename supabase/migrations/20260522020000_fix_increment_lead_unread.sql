-- Corrige increment_lead_unread para aceitar preview e timestamp
-- e atualizar tudo atomicamente em uma única operação (sem race condition)

CREATE OR REPLACE FUNCTION public.increment_lead_unread(
  _lead_id uuid,
  _preview  text    DEFAULT NULL,
  _ts       text    DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.leads
     SET unread_count        = COALESCE(unread_count, 0) + 1,
         last_message_at     = COALESCE(_ts::timestamptz, last_message_at, now()),
         last_inbound_at     = COALESCE(_ts::timestamptz, last_inbound_at, now()),
         last_message_preview = COALESCE(_preview, last_message_preview),
         updated_at          = now()
   WHERE id = _lead_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_lead_unread(uuid, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.increment_lead_unread(uuid, text, text) TO authenticated, service_role;
