CREATE OR REPLACE FUNCTION public.reset_unread(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store uuid;
BEGIN
  SELECT store_id INTO v_store FROM public.leads WHERE id = p_lead_id;
  IF v_store IS NULL THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;
  IF NOT public.is_store_member(v_store, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.leads
     SET unread_count = 0,
         updated_at = now()
   WHERE id = p_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_unread(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_unread(uuid) TO authenticated;