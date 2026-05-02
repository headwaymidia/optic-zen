CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_store_id uuid;
  store_name text;
  is_invited boolean;
BEGIN
  is_invited := COALESCE((NEW.raw_user_meta_data->>'invited')::boolean, false);

  -- Usuários convidados não recebem loja automática; serão vinculados ao aceitar o convite.
  IF is_invited THEN
    RETURN NEW;
  END IF;

  store_name := COALESCE(NEW.raw_user_meta_data->>'store_name', 'Minha Ótica');

  INSERT INTO public.stores (name, owner_id)
  VALUES (store_name, NEW.id)
  RETURNING id INTO new_store_id;

  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (new_store_id, NEW.id, 'Dono');

  RETURN NEW;
END;
$$;