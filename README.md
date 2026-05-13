# CRM Ótica Dominante

CRM completo para óticas, com funil de vendas, integração WhatsApp (Evolution API), gestão de receitas oftalmológicas, agenda de exames, follow-ups automáticos e dashboard executivo.

Construído sobre **Lovable Cloud** (Supabase gerenciado) e publicado em [optic-zen.lovable.app](https://optic-zen.lovable.app).

---

## Stack

- **Frontend:** React 18 · Vite 5 · TypeScript 5 · Tailwind CSS 3 · shadcn/ui · React Router · TanStack Query
- **Backend:** Supabase (Postgres + RLS + Realtime + Storage + Edge Functions Deno)
- **Integrações:** Evolution API (WhatsApp), Resend (email), Lovable AI Gateway
- **Bibliotecas-chave:** `date-fns`, `recharts`, `jspdf`, `emoji-picker-react`, `lucide-react`

---

## Rodando localmente

Pré-requisitos: **Node 18+** e [**Bun**](https://bun.sh) (ou npm).

```bash
bun install
bun run dev
```

A aplicação sobe em `http://localhost:8080`.

### Testes

```bash
bunx vitest run
```

---

## Variáveis de ambiente

O arquivo `.env` é gerado automaticamente pelo Lovable Cloud e **não deve ser editado manualmente**. Ele contém:

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon/publishable (segura no frontend) |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |

### Secrets de Edge Functions

Configurados via **Lovable Cloud → Secrets** (nunca commitar):

| Secret | Usado por | Origem |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` | Todas as functions | Auto-injetado |
| `EVOLUTION_API_URL` | `whatsapp-evolution`, `whatsapp-webhook` | Painel Evolution API |
| `EVOLUTION_API_KEY` | `whatsapp-evolution`, `whatsapp-webhook` | Painel Evolution API |
| `RESEND_API_KEY` | `send-welcome-email`, `notify-new-lead` | [resend.com/api-keys](https://resend.com/api-keys) |
| `LOVABLE_API_KEY` | Funcionalidades de IA | Auto-gerenciado |
| `CRON_SECRET` | `auto-repescagem` (header `x-cron-secret`) | Definido pelo time |

---

## Edge Functions

Todas ficam em `supabase/functions/<nome>/index.ts`. Funções atuais:

- **`whatsapp-evolution`** — envia mensagens (texto, mídia, áudio) via Evolution API.
- **`whatsapp-webhook`** — recebe eventos da Evolution API: cria leads, salva mensagens, atualiza status (delivered/read).
- **`auto-repescagem`** — job (cron) que move leads sem resposta para "Repescagem". Protegida por header `x-cron-secret`.
- **`send-welcome-email`** — email de boas-vindas após criação de loja.
- **`notify-new-lead`** — notifica o dono da loja por email quando chega um lead novo via WhatsApp.

### Deploy

Edge Functions e migrations do banco são **deployadas automaticamente** pelo Lovable a cada save — não há comando manual a rodar.

Se precisar invocar/testar manualmente:

```bash
# Via SDK
supabase.functions.invoke("whatsapp-evolution", { body: { ... } })

# Via curl (substitua o ref do projeto)
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/notify-new-lead" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"..."}'
```

Para rodar localmente com o CLI do Supabase (opcional):

```bash
supabase functions serve <nome> --env-file ./supabase/.env
```

---

## Estrutura

```
src/
├── components/        # UI (shadcn) + componentes de domínio
│   ├── chat/          # Painel de WhatsApp
│   └── ui/            # Componentes shadcn
├── hooks/             # useLeads, useStores, useTheme, useAuth, ...
├── pages/             # Rotas (Dashboard, Funil, WhatsApp, Agenda, ...)
├── integrations/
│   └── supabase/
│       ├── client.ts  # Client Supabase oficial (NÃO editar manualmente)
│       └── types.ts   # Tipos gerados (NÃO editar manualmente)
└── lib/               # Helpers, validators, exportReport, ...
supabase/
├── functions/         # Edge Functions (Deno)
└── migrations/        # SQL migrations (geradas pelo Lovable)
```

---

## Publicação

No editor Lovable, clique em **Publish** (canto superior direito). Mudanças no frontend exigem clicar em **Update** para irem ao ar; mudanças de backend (Edge Functions, migrations) sobem automaticamente.

Domínio publicado: `optic-zen.lovable.app`. Para domínio customizado: **Project Settings → Domains**.
