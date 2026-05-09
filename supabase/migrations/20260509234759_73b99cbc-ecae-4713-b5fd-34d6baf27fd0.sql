ALTER TABLE public.leads DROP COLUMN IF EXISTS assigned_to;
NOTIFY pgrst, 'reload schema';