import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStores } from "@/hooks/useStores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Settings,
  Users,
  Plug,
  Power,
  Copy,
  Check,
  ShieldCheck,
  BadgeCheck,
  Clock,
  FileText,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type TabKey = "geral" | "equipe" | "integracoes";

const TABS: { key: TabKey; label: string; icon: typeof Settings }[] = [
  { key: "geral", label: "Geral", icon: Settings },
  { key: "equipe", label: "Equipe", icon: Users },
  { key: "integracoes", label: "Integrações", icon: Plug },
];

/**
 * Mock de "store secrets" — futuramente virá da tabela `stores` no Supabase
 * com colunas isoladas por filial:
 *   whatsapp_number, phone_number_id, waba_id, access_token, status, business_name.
 * Cada loja possui sua própria conta na Meta Cloud API.
 */
function getMockStoreIntegration(storeId: string) {
  // Hash determinístico para gerar IDs estáveis por loja
  let h = 0;
  for (let i = 0; i < storeId.length; i++) h = (h * 31 + storeId.charCodeAt(i)) >>> 0;
  const seed = (h % 9000) + 1000;
  const tail = String(((h * 7) % 9000) + 1000);
  const online = storeId === "store-centro" || h % 3 !== 0;
  // IDs no padrão Meta Graph API: 15 a 16 dígitos
  const phone_number_id = String(100000000000000n + BigInt(h % 999999999));
  const waba_id = String(200000000000000n + BigInt((h * 11) % 999999999));
  // Access token Meta começa com "EAAG..." (System User Token)
  const access_token = `EAAG${(h * 17).toString(36)}${(h * 29).toString(36)}ZD`.padEnd(60, "x");
  return {
    whatsapp_number: `+55 11 9${seed}-${tail}`,
    business_name: storeId === "store-centro" ? "Ótica Dominante" : `Filial ${storeId.slice(-4).toUpperCase()}`,
    phone_number_id,
    waba_id,
    access_token,
    status: online ? ("online" as const) : ("offline" as const),
    last_sync: online ? "Há 2 minutos" : "Há 3 dias",
  };
}

/** Templates aprovados na Meta para esta loja (mock). */
const MOCK_TEMPLATES = [
  { name: "alerta_agendamento", category: "UTILITY", status: "approved" as const },
  { name: "recuperacao_orcamento", category: "MARKETING", status: "approved" as const },
  { name: "confirmacao_exame", category: "UTILITY", status: "approved" as const },
  { name: "boas_vindas_cliente", category: "MARKETING", status: "approved" as const },
  { name: "promocao_lentes_premium", category: "MARKETING", status: "in_review" as const },
];


export default function ConfiguracoesLoja() {
  const { currentStore, stores } = useStores();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") as TabKey) || "geral";
  const [tab, setTab] = useState<TabKey>(
    TABS.some((t) => t.key === tabParam) ? tabParam : "geral"
  );

  function handleTab(next: TabKey) {
    setTab(next);
    setSearchParams({ tab: next }, { replace: true });
  }

  if (!currentStore) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhuma loja selecionada.
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      {/* Cabeçalho */}
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Configurações da filial
        </p>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mt-1">
          {currentStore.name}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          As alterações abaixo afetam apenas esta filial.
        </p>
      </div>

      {/* Layout: sidebar interna + conteúdo */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        <nav className="md:sticky md:top-4 h-max">
          <ul className="flex md:flex-col gap-1 border border-border rounded-xl p-1 bg-card">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <li key={t.key} className="flex-1 md:flex-none">
                  <button
                    type="button"
                    onClick={() => handleTab(t.key)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          {tab === "geral" && <GeneralPanel store={currentStore} />}
          {tab === "equipe" && <TeamPanel storesCount={stores.length} />}
          {tab === "integracoes" && <IntegrationsPanel storeId={currentStore.id} storeName={currentStore.name} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- GERAL ---------- */
function GeneralPanel({ store }: { store: { id: string; name: string; role: string } }) {
  return (
    <SectionCard title="Informações da filial" description="Dados básicos exibidos no dashboard.">
      <Field label="Nome da loja" value={store.name} />
      <Field label="ID da loja" value={store.id} mono />
      <Field label="Sua permissão" value={store.role} />
    </SectionCard>
  );
}

/* ---------- EQUIPE ---------- */
function TeamPanel({ storesCount }: { storesCount: number }) {
  return (
    <SectionCard
      title="Equipe da filial"
      description="Em breve: convide vendedores e gerentes específicos para esta loja."
    >
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">Gerenciamento de equipe</p>
        <p className="text-xs text-muted-foreground mt-1">
          Você gerencia {storesCount} {storesCount === 1 ? "filial" : "filiais"}. Em breve será possível
          atribuir vendedores e gerentes individualmente por loja.
        </p>
      </div>
    </SectionCard>
  );
}

/* ---------- INTEGRAÇÕES ---------- */
function IntegrationsPanel({ storeId, storeName }: { storeId: string; storeName: string }) {
  const integration = useMemo(() => getMockStoreIntegration(storeId), [storeId]);
  const [status, setStatus] = useState(integration.status);
  const [copied, setCopied] = useState(false);

  // Reseta quando trocar de loja
  if (status !== integration.status && integration.status !== status) {
    // noop — mantém estado local após ação manual
  }

  function handleCopy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast({ title: `${label} copiado` });
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleSync() {
    toast({
      title: "Gerando QR Code…",
      description: `Conectando WhatsApp da filial "${storeName}".`,
    });
    setTimeout(() => {
      setStatus("online");
      toast({ title: "Aparelho sincronizado", description: integration.whatsapp_number });
    }, 1200);
  }

  function handleDisconnect() {
    setStatus("offline");
    toast({
      title: "Aparelho desconectado",
      description: `O WhatsApp de "${storeName}" foi desvinculado.`,
      variant: "destructive",
    });
  }

  const isOnline = status === "online";

  return (
    <div className="space-y-4">
      <SectionCard
        title="Conexão de Atendimento"
        description="Cada filial possui sua própria instância de WhatsApp Business API."
        icon={<WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />}
      >
        {/* Header do card: status + número */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-[#25D366]/10 text-[#1FAE54]">
                <WhatsAppGlyph className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Número conectado
              </p>
              <p className="text-base font-semibold tabular-nums text-foreground truncate">
                {integration.whatsapp_number}
              </p>
            </div>
          </div>
          <StatusBadge online={isOnline} />
        </div>

        {/* Metadados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <SecretRow
            label="Instance ID"
            value={integration.instance_id}
            onCopy={() => handleCopy(integration.instance_id, "Instance ID")}
            copied={copied}
          />
          <SecretRow
            label="API Token"
            value={maskToken(integration.api_token)}
            onCopy={() => handleCopy(integration.api_token, "API Token")}
            copied={copied}
          />
        </div>

        <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Credenciais isoladas para esta filial · Última sincronização: {integration.last_sync}</span>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
          {isOnline ? (
            <>
              <Button variant="outline" onClick={handleSync} className="gap-2">
                <QrCode className="h-4 w-4" />
                Re-sincronizar QR Code
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} className="gap-2">
                <Power className="h-4 w-4" />
                Desconectar Aparelho
              </Button>
            </>
          ) : (
            <Button onClick={handleSync} className="gap-2">
              <QrCode className="h-4 w-4" />
              Sincronizar QR Code
            </Button>
          )}
        </div>
      </SectionCard>

      <p className="text-[11px] text-muted-foreground px-1">
        Futuramente, estes dados serão persistidos em colunas isoladas
        (<code className="font-mono">whatsapp_number</code>, <code className="font-mono">api_token</code>,{" "}
        <code className="font-mono">instance_id</code>) na tabela <code className="font-mono">stores</code>.
      </p>
    </div>
  );
}

/* ---------- componentes auxiliares ---------- */

function SectionCard({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <header className="flex items-start gap-3">
        {icon && <div className="mt-0.5">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        readOnly
        value={value}
        className={cn("h-10 bg-muted/30", mono && "font-mono text-xs")}
      />
    </div>
  );
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold",
        online
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
      )}
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            online ? "bg-emerald-500" : "bg-red-500"
          )}
        />
      </span>
      {online ? "API Online" : "Desconectado"}
    </span>
  );
}

function SecretRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={value} className="h-9 font-mono text-xs bg-muted/30" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onCopy}
          aria-label={`Copiar ${label}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function maskToken(token: string) {
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}••••••••${token.slice(-4)}`;
}

/** Glyph oficial do WhatsApp (path simplificado) */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.057 21.785h-.005a9.87 9.87 0 0 1-5.031-1.378l-.36-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.889-9.884a9.83 9.83 0 0 1 6.991 2.898 9.825 9.825 0 0 1 2.892 6.994c-.003 5.45-4.437 9.884-9.888 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.473-8.413z" />
    </svg>
  );
}
