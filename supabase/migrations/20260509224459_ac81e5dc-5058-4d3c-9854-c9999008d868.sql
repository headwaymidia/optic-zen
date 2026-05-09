
-- 1) Índices
CREATE INDEX IF NOT EXISTS idx_leads_store_id ON public.leads(store_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_store ON public.leads(status, store_id);
CREATE INDEX IF NOT EXISTS idx_leads_responsible_id ON public.leads(responsible_id);
CREATE INDEX IF NOT EXISTS idx_leads_exam_date ON public.leads(exam_date) WHERE exam_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_next_return ON public.leads(next_return_date) WHERE next_return_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_members_user_id ON public.store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON public.store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_lead_id ON public.prescriptions(lead_id);

-- 2) Realtime para leads
ALTER TABLE public.leads REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'leads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.leads';
  END IF;
END $$;

-- 3) Check de prioridade
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_priority_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_priority_check
  CHECK (priority IS NULL OR priority IN ('Baixa', 'Normal', 'Média', 'Alta', 'Urgente'));

-- 4) Reload PostgREST
NOTIFY pgrst, 'reload schema';
