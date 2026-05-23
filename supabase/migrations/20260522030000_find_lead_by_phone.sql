-- Versiona a função find_lead_by_phone que existia apenas no banco.
-- Busca um lead pelo store_id + últimos 10 dígitos do telefone.
-- Usada pelo whatsapp-webhook para vincular mensagens a leads existentes.

CREATE OR REPLACE FUNCTION public.find_lead_by_phone(
  p_store_id uuid,
  p_last10   text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
    FROM public.leads
   WHERE store_id = p_store_id
     AND right(regexp_replace(phone, '\D', '', 'g'), 10) = right(p_last10, 10)
   ORDER BY created_at DESC
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.find_lead_by_phone(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.find_lead_by_phone(uuid, text) TO authenticated, service_role;
