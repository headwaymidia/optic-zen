CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  store_id uuid NOT NULL,
  user_id uuid,
  type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id, created_at DESC);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_activities_select"
  ON public.lead_activities FOR SELECT TO authenticated
  USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "lead_activities_insert"
  ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (is_store_member(store_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;

-- Helper: actor name (current auth user)
CREATE OR REPLACE FUNCTION public._actor_name()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p.full_name, split_part(p.email,'@',1), 'Sistema')
  FROM public.profiles p WHERE p.id = auth.uid();
$$;

-- Trigger on leads
CREATE OR REPLACE FUNCTION public.tg_lead_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text := COALESCE(public._actor_name(), 'Sistema');
  v_uid uuid := auth.uid();
  v_resp_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_activities(lead_id, store_id, user_id, type, description)
    VALUES (NEW.id, NEW.store_id, v_uid, 'created', 'Lead criado por ' || v_actor);

    IF NEW.responsible_id IS NOT NULL THEN
      SELECT full_name INTO v_resp_name FROM public.profiles WHERE id = NEW.responsible_id;
      INSERT INTO public.lead_activities(lead_id, store_id, user_id, type, description)
      VALUES (NEW.id, NEW.store_id, v_uid, 'assigned',
              COALESCE(v_resp_name, 'Vendedora') || ' atribuída ao lead');
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_activities(lead_id, store_id, user_id, type, description)
    VALUES (NEW.id, NEW.store_id, v_uid, 'status_changed',
            'Status alterado para ' || NEW.status || ' por ' || v_actor);
  END IF;

  IF NEW.responsible_id IS DISTINCT FROM OLD.responsible_id AND NEW.responsible_id IS NOT NULL THEN
    SELECT full_name INTO v_resp_name FROM public.profiles WHERE id = NEW.responsible_id;
    INSERT INTO public.lead_activities(lead_id, store_id, user_id, type, description)
    VALUES (NEW.id, NEW.store_id, v_uid, 'assigned',
            COALESCE(v_resp_name, 'Vendedora') || ' atribuída ao lead');
  END IF;

  IF NEW.exam_date IS DISTINCT FROM OLD.exam_date AND NEW.exam_date IS NOT NULL THEN
    INSERT INTO public.lead_activities(lead_id, store_id, user_id, type, description)
    VALUES (NEW.id, NEW.store_id, v_uid, 'exam_scheduled',
            'Exame agendado para ' ||
            to_char(NEW.exam_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') ||
            ' por ' || v_actor);
  END IF;

  IF NEW.lab_status IS DISTINCT FROM OLD.lab_status AND NEW.lab_status IS NOT NULL THEN
    INSERT INTO public.lead_activities(lead_id, store_id, user_id, type, description)
    VALUES (NEW.id, NEW.store_id, v_uid, 'lab_status',
            'Status do laboratório: ' || NEW.lab_status);
  END IF;

  IF NEW.notes IS DISTINCT FROM OLD.notes
     AND COALESCE(NEW.notes,'') <> '' THEN
    INSERT INTO public.lead_activities(lead_id, store_id, user_id, type, description)
    VALUES (NEW.id, NEW.store_id, v_uid, 'note', 'Observação adicionada');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_activity_ins
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_activity();

CREATE TRIGGER trg_lead_activity_upd
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_activity();

-- Trigger on prescriptions
CREATE OR REPLACE FUNCTION public.tg_prescription_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text := COALESCE(public._actor_name(), 'Sistema');
BEGIN
  INSERT INTO public.lead_activities(lead_id, store_id, user_id, type, description)
  VALUES (NEW.lead_id, NEW.store_id, auth.uid(), 'prescription',
          'Receita oftalmológica salva por ' || v_actor);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prescription_activity
AFTER INSERT ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_prescription_activity();