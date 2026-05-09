## Migration corrigida — anexar triggers no projeto `fxcgvlukzjmwzpzuvzcp`

Cole o SQL abaixo no **SQL Editor** do projeto **crm-optico (fxcgvlukzjmwzpzuvzcp)** e execute. É idempotente — pode rodar várias vezes sem erro.

### O que essa migration faz

- Garante constraint `UNIQUE(store_id)` em `subscriptions` (necessária para o `ON CONFLICT` do trigger de trial)
- Cria trigger em `auth.users` → cria profile (e loja só se `store_name` veio no metadata)
- Cria trigger em `stores` → cria subscription trial de 14 dias
- Cria triggers `BEFORE UPDATE` para manter `updated_at` em `leads`, `stores`, `profiles`, `subscriptions`
- Cria trigger em `leads` → recalcula `next_return_date` quando `last_exam_date` muda
- Cria trigger em `prescriptions` → atualiza `leads.last_exam_date` com a data mais recente e recalcula retorno
- Recarrega o schema do PostgREST

### SQL

```sql
-- =========================================================
-- 1) Garantir UNIQUE(store_id) em subscriptions (idempotente)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_store_id_key'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_store_id_key UNIQUE (store_id);
  END IF;
END $$;

-- =========================================================
-- 2) Trigger em auth.users → handle_new_user
-- =========================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 3) Trigger em stores → cria subscription trial
-- =========================================================
DROP TRIGGER IF EXISTS tg_stores_create_trial ON public.stores;
CREATE TRIGGER tg_stores_create_trial
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_create_trial_subscription();

-- =========================================================
-- 4) Triggers BEFORE UPDATE → atualizar updated_at
-- =========================================================
DROP TRIGGER IF EXISTS tg_leads_set_updated_at ON public.leads;
CREATE TRIGGER tg_leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS tg_stores_set_updated_at ON public.stores;
CREATE TRIGGER tg_stores_set_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS tg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER tg_profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS tg_subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER tg_subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 5) Trigger em leads → recalcula next_return_date
-- =========================================================
DROP TRIGGER IF EXISTS tg_leads_recalc_return ON public.leads;
CREATE TRIGGER tg_leads_recalc_return
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_leads_recalc_return();

-- =========================================================
-- 6) Trigger em prescriptions → atualiza last_exam_date do lead
-- =========================================================
DROP TRIGGER IF EXISTS tg_prescriptions_update_lead_return ON public.prescriptions;
CREATE TRIGGER tg_prescriptions_update_lead_return
  AFTER INSERT OR UPDATE OR DELETE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_prescriptions_update_lead_return();

-- =========================================================
-- 7) Recarregar schema do PostgREST
-- =========================================================
NOTIFY pgrst, 'reload schema';
```

### Verificação após executar

Rode esta query para confirmar que os 8 triggers foram criados:

```sql
SELECT event_object_schema, event_object_table, trigger_name
FROM information_schema.triggers
WHERE trigger_name IN (
  'on_auth_user_created',
  'tg_stores_create_trial',
  'tg_leads_set_updated_at',
  'tg_stores_set_updated_at',
  'tg_profiles_set_updated_at',
  'tg_subscriptions_set_updated_at',
  'tg_leads_recalc_return',
  'tg_prescriptions_update_lead_return'
)
ORDER BY event_object_table, trigger_name;
```

Deve retornar 8 linhas. Se faltar algum, me avise qual.
