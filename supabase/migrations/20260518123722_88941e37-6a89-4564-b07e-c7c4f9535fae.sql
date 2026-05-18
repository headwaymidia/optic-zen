CREATE TABLE IF NOT EXISTS public.logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid,
  function_name text,
  level text NOT NULL DEFAULT 'info',
  event text,
  message text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_store_id ON public.logs (store_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON public.logs (level);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select_admins"
ON public.logs
FOR SELECT
TO authenticated
USING (
  store_id IS NOT NULL
  AND public.has_store_role(store_id, auth.uid(), ARRAY['Dono'::text, 'Gerente'::text])
);