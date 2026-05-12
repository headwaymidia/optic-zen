
-- =========================================================
-- 1) Bucket whatsapp-media: privatizar + RLS por store_id
-- =========================================================
UPDATE storage.buckets SET public = false WHERE id = 'whatsapp-media';

-- Limpar policies antigas do bucket (idempotente)
DROP POLICY IF EXISTS "wa_media_select_public" ON storage.objects;
DROP POLICY IF EXISTS "wa_media_select" ON storage.objects;
DROP POLICY IF EXISTS "wa_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "wa_media_update" ON storage.objects;
DROP POLICY IF EXISTS "wa_media_delete" ON storage.objects;

CREATE POLICY "wa_media_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND public.is_store_member(
    ((storage.foldername(name))[1])::uuid,
    auth.uid()
  )
);

CREATE POLICY "wa_media_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-media'
  AND public.is_store_member(
    ((storage.foldername(name))[1])::uuid,
    auth.uid()
  )
);

CREATE POLICY "wa_media_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND public.is_store_member(
    ((storage.foldername(name))[1])::uuid,
    auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'whatsapp-media'
  AND public.is_store_member(
    ((storage.foldername(name))[1])::uuid,
    auth.uid()
  )
);

CREATE POLICY "wa_media_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND public.has_store_role(
    ((storage.foldername(name))[1])::uuid,
    auth.uid(),
    ARRAY['Dono','Gerente']
  )
);

-- =========================================================
-- 3) Realtime: restringir acesso a authenticated
-- =========================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_authenticated_only" ON realtime.messages;
CREATE POLICY "realtime_authenticated_only"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);

-- =========================================================
-- 4) store_members: bloquear privilege escalation
--    Gerentes NÃO podem criar/alterar Donos.
-- =========================================================
DROP POLICY IF EXISTS members_insert_admins ON public.store_members;
CREATE POLICY members_insert_admins
ON public.store_members FOR INSERT
TO authenticated
WITH CHECK (
  (
    -- Dono pode adicionar qualquer papel
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_members.store_id AND s.owner_id = auth.uid())
    OR public.has_store_role(store_id, auth.uid(), ARRAY['Dono'])
    OR (
      -- Gerente só pode adicionar Vendedora/Gerente, nunca Dono
      public.has_store_role(store_id, auth.uid(), ARRAY['Gerente'])
      AND role <> 'Dono'
    )
  )
);

DROP POLICY IF EXISTS members_update_admins ON public.store_members;
CREATE POLICY members_update_admins
ON public.store_members FOR UPDATE
TO authenticated
USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']))
WITH CHECK (
  public.has_store_role(store_id, auth.uid(), ARRAY['Dono'])
  OR (
    public.has_store_role(store_id, auth.uid(), ARRAY['Gerente'])
    AND role <> 'Dono'
  )
);

-- =========================================================
-- 5) subscriptions: apenas Dono pode atualizar
-- =========================================================
DROP POLICY IF EXISTS subs_update ON public.subscriptions;
CREATE POLICY subs_update
ON public.subscriptions FOR UPDATE
TO authenticated
USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono']))
WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['Dono']));

-- =========================================================
-- 6) store_invites: SELECT restrito a Dono ou ao próprio criador
-- =========================================================
DROP POLICY IF EXISTS invites_select_admins ON public.store_invites;
CREATE POLICY invites_select_scoped
ON public.store_invites FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid()
  OR public.has_store_role(store_id, auth.uid(), ARRAY['Dono'])
);

-- =========================================================
-- 7) Revogar EXECUTE de public/anon em funções SECURITY DEFINER
--    Mantém execução para authenticated nas RPCs chamadas pelo cliente.
-- =========================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- RPCs chamadas pelo frontend autenticado
GRANT EXECUTE ON FUNCTION public.accept_store_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_cooling_notifications() TO authenticated;
-- get_invite_by_token também é consultada antes do login (página pública de aceite)
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(uuid) TO anon;
