-- Garantir RLS habilitado (idempotente)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Policy explicitamente nomeada conforme solicitado.
-- Coexiste com a policy existente "stores_insert_owner" (mesma regra),
-- ambas são permissivas, então qualquer uma sendo satisfeita libera o INSERT.
DROP POLICY IF EXISTS "users can create their own store" ON public.stores;
CREATE POLICY "users can create their own store" ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);