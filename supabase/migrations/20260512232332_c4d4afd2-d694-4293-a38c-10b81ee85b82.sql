
CREATE OR REPLACE FUNCTION public.increment_lead_unread(_lead_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.leads
     SET unread_count = COALESCE(unread_count, 0) + 1,
         updated_at   = now()
   WHERE id = _lead_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_lead_unread(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_lead_unread(uuid) TO authenticated, service_role;
