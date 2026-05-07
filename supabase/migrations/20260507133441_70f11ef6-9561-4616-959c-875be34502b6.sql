CREATE OR REPLACE FUNCTION public.recalc_lead_next_return(_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date;
BEGIN
  SELECT last_exam_date INTO v_last FROM public.leads WHERE id = _lead_id;
  UPDATE public.leads
  SET next_return_date = CASE WHEN v_last IS NULL THEN NULL ELSE (v_last + INTERVAL '1 year')::date END
  WHERE id = _lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_leads_recalc_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_exam_date IS DISTINCT FROM OLD.last_exam_date THEN
    NEW.next_return_date := CASE WHEN NEW.last_exam_date IS NULL THEN NULL ELSE (NEW.last_exam_date + INTERVAL '1 year')::date END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_recalc_return ON public.leads;
CREATE TRIGGER leads_recalc_return
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_leads_recalc_return();