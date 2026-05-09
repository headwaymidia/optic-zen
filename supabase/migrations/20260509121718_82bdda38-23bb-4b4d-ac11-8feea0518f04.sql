
-- 1. Update handle_new_user to only create store when store_name is explicitly provided
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

  -- Ensure profile exists
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

  -- Invited users won't get an auto store
  IF is_invited THEN
    RETURN NEW;
  END IF;

  -- Only create store if store_name was explicitly provided in metadata
  store_name := NEW.raw_user_meta_data->>'store_name';
  IF store_name IS NULL OR length(trim(store_name)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.stores (name, owner_id)
  VALUES (store_name, NEW.id)
  RETURNING id INTO new_store_id;

  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (new_store_id, NEW.id, 'Dono')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 1. Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Trial subscription on store creation
DROP TRIGGER IF EXISTS tg_stores_create_trial ON public.stores;
CREATE TRIGGER tg_stores_create_trial
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.tg_create_trial_subscription();

-- Ensure unique constraint so trial subscription ON CONFLICT works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_store_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_store_id_key UNIQUE (store_id);
  END IF;
END$$;

-- 3. updated_at triggers
DROP TRIGGER IF EXISTS tg_leads_set_updated_at ON public.leads;
CREATE TRIGGER tg_leads_set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS tg_stores_set_updated_at ON public.stores;
CREATE TRIGGER tg_stores_set_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS tg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER tg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS tg_subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER tg_subscriptions_set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- prescriptions has no updated_at column, skip
-- store_members has no updated_at column, skip

-- 4. Recalc next_return_date when last_exam_date changes
DROP TRIGGER IF EXISTS tg_leads_recalc_return ON public.leads;
CREATE TRIGGER tg_leads_recalc_return
BEFORE UPDATE OF last_exam_date ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_leads_recalc_return();

-- 5. Update lead last_exam_date when prescription is added/changed
CREATE OR REPLACE FUNCTION public.tg_prescriptions_update_lead_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT MAX(created_at::date) INTO v_max_date
    FROM public.prescriptions WHERE lead_id = OLD.lead_id;
    UPDATE public.leads SET last_exam_date = v_max_date WHERE id = OLD.lead_id;
    PERFORM public.recalc_lead_next_return(OLD.lead_id);
    RETURN OLD;
  ELSE
    SELECT MAX(created_at::date) INTO v_max_date
    FROM public.prescriptions WHERE lead_id = NEW.lead_id;
    UPDATE public.leads SET last_exam_date = v_max_date WHERE id = NEW.lead_id;
    PERFORM public.recalc_lead_next_return(NEW.lead_id);
    RETURN NEW;
  END IF;
END;
$function$;

DROP TRIGGER IF EXISTS tg_prescriptions_update_lead ON public.prescriptions;
CREATE TRIGGER tg_prescriptions_update_lead
AFTER INSERT OR UPDATE OR DELETE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_prescriptions_update_lead_return();

-- 6. Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
