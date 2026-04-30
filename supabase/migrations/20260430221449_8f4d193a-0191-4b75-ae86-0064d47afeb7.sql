
DROP POLICY IF EXISTS "stores_select_members" ON public.stores;

CREATE POLICY "stores_select_owner_or_member" ON public.stores
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_store_member(id, auth.uid())
  );
