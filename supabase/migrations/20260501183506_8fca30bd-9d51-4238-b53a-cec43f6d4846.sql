ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_store" ON public.stores;
DROP POLICY IF EXISTS "select_own_store" ON public.stores;
DROP POLICY IF EXISTS "update_own_store" ON public.stores;
DROP POLICY IF EXISTS "delete_own_store" ON public.stores;
DROP POLICY IF EXISTS "users can create their own store" ON public.stores;
DROP POLICY IF EXISTS "users can view their own stores" ON public.stores;
DROP POLICY IF EXISTS "stores_insert_owner" ON public.stores;
DROP POLICY IF EXISTS "stores_select_owner_or_member" ON public.stores;
DROP POLICY IF EXISTS "stores_update_owner" ON public.stores;
DROP POLICY IF EXISTS "stores_delete_owner" ON public.stores;

CREATE POLICY "insert_own_store" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Mantém acesso de leitura para owner OU membros vinculados (necessário para multi-tenant).
CREATE POLICY "select_own_store" ON public.stores
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_store_member(id, auth.uid()));

CREATE POLICY "update_own_store" ON public.stores
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "delete_own_store" ON public.stores
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);