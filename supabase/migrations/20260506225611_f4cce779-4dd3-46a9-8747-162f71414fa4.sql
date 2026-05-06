ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lab_name text,
  ADD COLUMN IF NOT EXISTS lab_order_number text,
  ADD COLUMN IF NOT EXISTS lab_status text;