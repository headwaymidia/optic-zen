ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS exam_date timestamptz;
CREATE INDEX IF NOT EXISTS idx_leads_exam_date ON public.leads(exam_date);