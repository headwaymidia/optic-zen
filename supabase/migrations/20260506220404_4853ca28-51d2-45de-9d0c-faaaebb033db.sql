-- 1. Coluna next_return_date
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_return_date date;

-- 2. Função para recalcular next_return_date a partir da receita mais recente
CREATE OR REPLACE FUNCTION public.recalc_lead_next_return(_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest timestamptz;
BEGIN
  SELECT MAX(created_at) INTO v_latest
  FROM public.prescriptions
  WHERE lead_id = _lead_id;

  UPDATE public.leads
  SET next_return_date = CASE WHEN v_latest IS NULL THEN NULL ELSE (v_latest::date + INTERVAL '1 year')::date END
  WHERE id = _lead_id;
END;
$$;

-- 3. Trigger em prescriptions
CREATE OR REPLACE FUNCTION public.tg_prescriptions_update_lead_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_lead_next_return(OLD.lead_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_lead_next_return(NEW.lead_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS prescriptions_update_lead_return ON public.prescriptions;
CREATE TRIGGER prescriptions_update_lead_return
AFTER INSERT OR UPDATE OR DELETE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_prescriptions_update_lead_return();

-- 4. Função para mover leads próximos do retorno para Repescagem
CREATE OR REPLACE FUNCTION public.auto_move_due_returns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH moved AS (
    UPDATE public.leads
    SET status = 'Repescagem', updated_at = now()
    WHERE status = 'Compareceu e Comprou'
      AND next_return_date IS NOT NULL
      AND next_return_date <= (CURRENT_DATE + INTERVAL '30 days')::date
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM moved;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_move_due_returns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_lead_next_return(uuid) FROM anon, authenticated;

-- 5. Backfill: calcular next_return_date para leads que já têm receitas
UPDATE public.leads l
SET next_return_date = (sub.latest::date + INTERVAL '1 year')::date
FROM (
  SELECT lead_id, MAX(created_at) AS latest
  FROM public.prescriptions
  GROUP BY lead_id
) sub
WHERE l.id = sub.lead_id;