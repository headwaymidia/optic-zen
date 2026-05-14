CREATE OR REPLACE FUNCTION public.add_store_owner(p_store_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Não autorizado: usuário só pode vincular a si mesmo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Loja não encontrada ou usuário não é o owner';
  END IF;

  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (p_store_id, p_user_id, 'Dono')
  ON CONFLICT (store_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_store_owner(uuid, uuid) TO authenticated;