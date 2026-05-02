-- Tabela de convites
CREATE TABLE public.store_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('Dono','Gerente','Vendedor')),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aceito','revogado','expirado')),
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid
);

CREATE INDEX idx_store_invites_store ON public.store_invites(store_id);
CREATE INDEX idx_store_invites_email ON public.store_invites(lower(email));
CREATE UNIQUE INDEX uniq_pending_invite ON public.store_invites(store_id, lower(email)) WHERE status = 'pendente';

ALTER TABLE public.store_invites ENABLE ROW LEVEL SECURITY;

-- Admins da loja gerenciam convites
CREATE POLICY invites_select_admins ON public.store_invites
FOR SELECT TO authenticated
USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

CREATE POLICY invites_insert_admins ON public.store_invites
FOR INSERT TO authenticated
WITH CHECK (
  public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente'])
  AND invited_by = auth.uid()
);

CREATE POLICY invites_update_admins ON public.store_invites
FOR UPDATE TO authenticated
USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']))
WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

CREATE POLICY invites_delete_admins ON public.store_invites
FOR DELETE TO authenticated
USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

-- Função RPC: buscar convite por token (para tela de aceite, sem exigir admin)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  store_name text,
  email text,
  role text,
  status text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.store_id, s.name AS store_name, i.email, i.role, i.status, i.expires_at
  FROM public.store_invites i
  JOIN public.stores s ON s.id = i.store_id
  WHERE i.token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(uuid) TO anon, authenticated;

-- Função RPC: aceitar convite
CREATE OR REPLACE FUNCTION public.accept_store_invite(_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.store_invites%ROWTYPE;
  v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_invite FROM public.store_invites WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;

  IF v_invite.status <> 'pendente' THEN
    RAISE EXCEPTION 'Convite já foi % e não pode ser usado', v_invite.status;
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE public.store_invites SET status = 'expirado' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Convite expirado';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF lower(v_user_email) <> lower(v_invite.email) THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail (%). Faça login com a conta correta.', v_invite.email;
  END IF;

  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (v_invite.store_id, auth.uid(), v_invite.role)
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.store_invites
  SET status = 'aceito', accepted_at = now(), accepted_by = auth.uid()
  WHERE id = v_invite.id;

  RETURN v_invite.store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_store_invite(uuid) TO authenticated;