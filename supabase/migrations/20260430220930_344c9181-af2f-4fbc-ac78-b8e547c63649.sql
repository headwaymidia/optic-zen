
-- =========================================================
-- MULTI-TENANT SCHEMA
-- =========================================================

-- 1. STORES (lojas / óticas / tenants)
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stores_owner ON public.stores(owner_id);

-- 2. STORE MEMBERS (funcionários vinculados a cada loja)
CREATE TABLE public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Dono','Gerente','Vendedor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
CREATE INDEX idx_store_members_store ON public.store_members(store_id);
CREATE INDEX idx_store_members_user ON public.store_members(user_id);

-- 3. LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'Novo Lead',
  priority text,
  notes text,
  responsible_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_value numeric(12,2),
  lead_source text,
  interest_tag text,
  follow_up_date timestamptz,
  follow_up_count int NOT NULL DEFAULT 0,
  last_follow_up_at timestamptz,
  last_inbound_at timestamptz,
  last_interaction timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_store ON public.leads(store_id);
CREATE INDEX idx_leads_status ON public.leads(store_id, status);

-- 4. CONTATOS
CREATE TABLE public.contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contatos_store ON public.contatos(store_id);

-- 5. TAREFAS
CREATE TABLE public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tarefas_store ON public.tarefas(store_id);
CREATE INDEX idx_tarefas_assigned ON public.tarefas(assigned_to);

-- =========================================================
-- HELPER FUNCTIONS (security definer, evita recursão em RLS)
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_store_member(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_store_role(_store_id uuid, _user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = _user_id AND role = ANY(_roles)
  );
$$;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.stores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas        ENABLE ROW LEVEL SECURITY;

-- STORES
CREATE POLICY "stores_select_members" ON public.stores
  FOR SELECT TO authenticated
  USING (public.is_store_member(id, auth.uid()));

CREATE POLICY "stores_insert_owner" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "stores_update_owner" ON public.stores
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "stores_delete_owner" ON public.stores
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- STORE_MEMBERS
CREATE POLICY "members_select_same_store" ON public.store_members
  FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));

CREATE POLICY "members_insert_admins" ON public.store_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente'])
    OR (
      -- Permite o próprio dono se inscrever ao criar a loja
      EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
    )
  );

CREATE POLICY "members_update_admins" ON public.store_members
  FOR UPDATE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']))
  WITH CHECK (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

CREATE POLICY "members_delete_admins" ON public.store_members
  FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

-- LEADS
CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "leads_insert" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "leads_update" ON public.leads FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "leads_delete" ON public.leads FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

-- CONTATOS
CREATE POLICY "contatos_select" ON public.contatos FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "contatos_insert" ON public.contatos FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "contatos_update" ON public.contatos FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "contatos_delete" ON public.contatos FOR DELETE TO authenticated
  USING (public.has_store_role(store_id, auth.uid(), ARRAY['Dono','Gerente']));

-- TAREFAS
CREATE POLICY "tarefas_select" ON public.tarefas FOR SELECT TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "tarefas_insert" ON public.tarefas FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "tarefas_update" ON public.tarefas FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_member(store_id, auth.uid()));
CREATE POLICY "tarefas_delete" ON public.tarefas FOR DELETE TO authenticated
  USING (public.is_store_member(store_id, auth.uid()));

-- =========================================================
-- TRIGGERS — updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stores_updated   BEFORE UPDATE ON public.stores   FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_leads_updated    BEFORE UPDATE ON public.leads    FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_contatos_updated BEFORE UPDATE ON public.contatos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_tarefas_updated  BEFORE UPDATE ON public.tarefas  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- AUTO-PROVISION: cria loja + vínculo Dono ao confirmar conta
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_store_id uuid;
  store_name text;
BEGIN
  store_name := COALESCE(NEW.raw_user_meta_data->>'store_name', 'Minha Ótica');

  INSERT INTO public.stores (name, owner_id)
  VALUES (store_name, NEW.id)
  RETURNING id INTO new_store_id;

  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (new_store_id, NEW.id, 'Dono');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
