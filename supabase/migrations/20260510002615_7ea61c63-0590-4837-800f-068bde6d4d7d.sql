-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Insert is via SECURITY DEFINER triggers only; no insert policy needed.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Trigger: new lead -> notify all store members
CREATE OR REPLACE FUNCTION public.tg_notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, store_id, type, title, body, lead_id)
  SELECT sm.user_id, NEW.store_id, 'new_lead',
         'Novo lead: ' || NEW.name,
         COALESCE('Origem: ' || NEW.lead_source, 'Lead recém-cadastrado'),
         NEW.id
  FROM public.store_members sm
  WHERE sm.store_id = NEW.store_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_lead();

-- Trigger: exam_date set/changed to today -> notify responsible
CREATE OR REPLACE FUNCTION public.tg_notify_exam_today()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.responsible_id IS NULL OR NEW.exam_date IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.exam_date::date <> CURRENT_DATE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.exam_date IS NOT DISTINCT FROM NEW.exam_date
     AND OLD.responsible_id IS NOT DISTINCT FROM NEW.responsible_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, store_id, type, title, body, lead_id)
  VALUES (
    NEW.responsible_id, NEW.store_id, 'exam_today',
    'Exame hoje: ' || NEW.name,
    'Agendado para ' || to_char(NEW.exam_date AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_exam_today
AFTER INSERT OR UPDATE OF exam_date, responsible_id ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_exam_today();

-- Trigger: lab_status -> "Pronto no laboratório" notify team
CREATE OR REPLACE FUNCTION public.tg_notify_lab_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lab_status IS DISTINCT FROM OLD.lab_status
     AND NEW.lab_status = 'Pronto no laboratório' THEN
    INSERT INTO public.notifications (user_id, store_id, type, title, body, lead_id)
    SELECT sm.user_id, NEW.store_id, 'lab_ready',
           'Pedido pronto: ' || NEW.name,
           COALESCE('Pedido ' || NEW.lab_order_number, 'Disponível para retirada'),
           NEW.id
    FROM public.store_members sm
    WHERE sm.store_id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_lab_ready
AFTER UPDATE OF lab_status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_lab_ready();

-- Helper RPC: generate "lead esfriando" notifications for current user's stores.
-- Idempotent: only one per (lead, day).
CREATE OR REPLACE FUNCTION public.generate_cooling_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  WITH eligible AS (
    SELECT l.id, l.store_id, l.name, l.responsible_id
    FROM public.leads l
    JOIN public.store_members sm ON sm.store_id = l.store_id
    WHERE sm.user_id = auth.uid()
      AND l.status = 'Aguardando Resposta'
      AND COALESCE(l.last_interaction, l.updated_at) < now() - interval '8 hours'
  ),
  ins AS (
    INSERT INTO public.notifications (user_id, store_id, type, title, body, lead_id)
    SELECT COALESCE(e.responsible_id, auth.uid()), e.store_id, 'lead_cooling',
           'Lead esfriando: ' || e.name,
           'Sem resposta há mais de 8 horas',
           e.id
    FROM eligible e
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.lead_id = e.id
        AND n.type = 'lead_cooling'
        AND n.created_at::date = CURRENT_DATE
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM ins;
  RETURN v_inserted;
END;
$$;