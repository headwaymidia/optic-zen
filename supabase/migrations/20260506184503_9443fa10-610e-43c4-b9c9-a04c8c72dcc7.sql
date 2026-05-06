ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to text;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);