CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_store_id uuid;
  store_name text;
  is_invited boolean;
BEGIN
  is_invited := COALESCE((NEW.raw_user_meta_data->>'invited')::boolean, false);

  -- Always ensure profile exists
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  -- Invited users won't get an auto store (they join an existing one)
  IF is_invited THEN
    RETURN NEW;
  END IF;

  -- Only create a store if store_name was explicitly provided AND not empty.
  -- Otherwise, leave the store creation to the Onboarding flow.
  store_name := NEW.raw_user_meta_data->>'store_name';
  IF store_name IS NULL OR length(trim(store_name)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.stores (name, owner_id)
  VALUES (trim(store_name), NEW.id)
  RETURNING id INTO new_store_id;

  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (new_store_id, NEW.id, 'Dono')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;