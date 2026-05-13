-- Update handle_new_user and handle_new_profile triggers to also persist
-- the phone (saved into profiles.whatsapp) coming from signup metadata.

CREATE OR REPLACE FUNCTION public.handle_new_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        whatsapp = COALESCE(public.profiles.whatsapp, EXCLUDED.whatsapp);
  RETURN NEW;
END;
$function$;

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

  INSERT INTO public.profiles (id, full_name, email, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        whatsapp = COALESCE(public.profiles.whatsapp, EXCLUDED.whatsapp);

  IF is_invited THEN
    RETURN NEW;
  END IF;

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