CREATE OR REPLACE FUNCTION public.accept_store_invite(_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.store_invites%ROWTYPE;
  v_user_email text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 1) Buscar convite pelo token
  SELECT * INTO v_invite FROM public.store_invites WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado para o token informado';
  END IF;

  RAISE NOTICE 'accept_store_invite: token=% store_id=% role=% email=% status=%',
    _token, v_invite.store_id, v_invite.role, v_invite.email, v_invite.status;

  -- 2) Validar status e expiração
  IF v_invite.status <> 'pendente' THEN
    RAISE EXCEPTION 'Convite já foi % e não pode ser usado', v_invite.status;
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE public.store_invites SET status = 'expirado' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Convite expirado em %', v_invite.expires_at;
  END IF;

  -- 3) Validar e-mail do usuário corresponde ao convite
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF lower(v_user_email) <> lower(v_invite.email) THEN
    RAISE EXCEPTION 'Este convite foi enviado para % e não pode ser aceito por %', v_invite.email, v_user_email;
  END IF;

  -- 4) Inserir/atualizar vínculo na loja exata do convite
  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (v_invite.store_id, v_user_id, v_invite.role)
  ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- 5) Marcar convite como aceito
  UPDATE public.store_invites
  SET status = 'aceito', accepted_at = now(), accepted_by = v_user_id
  WHERE id = v_invite.id;

  RAISE NOTICE 'accept_store_invite OK: user=% vinculado à store=% como %',
    v_user_id, v_invite.store_id, v_invite.role;

  -- 6) Retornar o store_id exato do convite
  RETURN v_invite.store_id;
END;
$function$;