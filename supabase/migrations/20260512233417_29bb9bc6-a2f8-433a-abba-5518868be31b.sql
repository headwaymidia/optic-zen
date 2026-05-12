-- 2) generate_cooling_notifications: validar que auth.uid() é membro de alguma loja
CREATE OR REPLACE FUNCTION public.generate_cooling_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.store_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro de nenhuma loja';
  END IF;

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
$function$;

-- 3) tg_notify_new_lead: notificar apenas Donos e Gerentes
CREATE OR REPLACE FUNCTION public.tg_notify_new_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, store_id, type, title, body, lead_id)
  SELECT sm.user_id, NEW.store_id, 'new_lead',
         'Novo lead: ' || NEW.name,
         COALESCE('Origem: ' || NEW.lead_source, 'Lead recém-cadastrado'),
         NEW.id
  FROM public.store_members sm
  WHERE sm.store_id = NEW.store_id
    AND sm.role IN ('Dono', 'Gerente');
  RETURN NEW;
END;
$function$;