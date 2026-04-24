
## Popular base com leads demo

Inserir 12 leads de teste vinculados ao seu `company_id` para validar visualmente **ESFRIANDO**, **Repescagem** e **ROI**.

### Pré-requisito crítico (bloqueio atual)

A tabela `profiles` está com **recursão infinita em RLS** (HTTP 500 nos logs). Sem corrigir, o frontend nunca carrega `company_id` e os leads inseridos não aparecerão. A correção entra na mesma migration, antes do seed:

```sql
-- 1. Função SECURITY DEFINER para quebrar a recursão
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- 2. Recriar policies de profiles sem self-reference
DROP POLICY IF EXISTS "..." ON public.profiles; -- todas as antigas
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- 3. Policies de leads usando a função
DROP POLICY IF EXISTS "..." ON public.leads;
CREATE POLICY "Company members read leads" ON public.leads
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company members write leads" ON public.leads
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 4. Garantir colunas (idempotente)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sale_value numeric,
  ADD COLUMN IF NOT EXISTS last_interaction timestamptz;
```

### Dados a inserir (12 leads, company_id = `fda940ec...`)

| # | Nome | Status | Prioridade | created_at | sale_value | Valida |
|---|------|--------|-----------|------------|-----------|--------|
| 1 | Ana Souza | Novo Lead | Alta | -30min | — | card normal |
| 2 | Bruno Lima | Novo Lead | Média | -3h | — | **ESFRIANDO** |
| 3 | Carla Dias | Aguardando Resposta | Alta | -5h | — | **ESFRIANDO** |
| 4 | Diego Rocha | Aguardando Resposta | Baixa | -1h | — | normal |
| 5 | Eduarda Melo | Agendou Exame | Alta | -1d | — | contagem |
| 6 | Felipe Alves | Agendou Exame | Média | -2d | — | contagem |
| 7 | Gabriela Pinto | Não Compareceu | Média | -3d | — | contagem |
| 8 | Henrique Sá | Compareceu e Comprou | Alta | -4d | **2.450** | **ROI** |
| 9 | Isabela Castro | Compareceu e Comprou | Alta | -5d | **3.890** | **ROI** |
| 10 | João Vieira | Compareceu e Comprou | Média | -6d | **1.200** | **ROI = R$ 7.540** |
| 11 | Karina Reis | Compareceu e Não Comprou | Baixa | -7d | — | contagem |
| 12 | Lucas Mendes | Repescagem | Média | -10d | — | **tag Repescagem** |

Telefones com DDI 55 + DDD 11 para validar link WhatsApp.

### Resultado esperado no app

- Dashboard ROI: **R$ 7.540,00**
- Total leads: **12**, distribuídos por todas as 7 colunas
- Bruno e Carla com badge **ESFRIANDO** + borda pulsante
- Lucas com tag **Repescagem**
- Realtime: arrastar card atualiza dashboard sem reload

### Passos

1. Aplicar migration (RLS fix + colunas)
2. Recarregar preview e confirmar que `useAuth` carrega o profile (sem 500)
3. Inserir os 12 leads via INSERT
4. Validar visualmente Dashboard + Funil
