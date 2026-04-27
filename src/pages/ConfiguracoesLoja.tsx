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
  MoreVertical,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  function handleConnect() {
    toast({
      title: "Redirecionando para o Meta Business…",
      description: `Autorizando WhatsApp Cloud API para "${storeName}".`,
    });
    setTimeout(() => {
      setStatus("online");
      toast({
        title: "Conta Meta conectada",
        description: `${integration.business_name} · ${integration.whatsapp_number}`,
      });
    }, 1200);
  }

  function handleDisconnect() {
    setStatus("offline");
    toast({
      title: "Conta desconectada",
      description: `O acesso à Meta Cloud API de "${storeName}" foi revogado.`,
      variant: "destructive",
    });
  }

  const isOnline = status === "online";
  const approved = MOCK_TEMPLATES.filter((t) => t.status === "approved");
  const inReview = MOCK_TEMPLATES.filter((t) => t.status === "in_review");

  return (
    <div className="space-y-4">
      <SectionCard
        title="Conexão de Atendimento"
        description="WhatsApp Business Platform · Cloud API oficial gerenciada pela Meta."
        icon={<WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />}
        rightSlot={<OfficialApiBadge />}
      >
        {/* Header: business + número + status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-[#25D366]/10 text-[#1FAE54]">
                <WhatsAppGlyph className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BadgeCheck className="h-3 w-3 text-[#1FAE54]" />
                {integration.business_name}
              </p>
              <p className="text-base font-semibold tabular-nums text-foreground truncate">
                {integration.whatsapp_number}
              </p>
            </div>
          </div>
          <StatusBadge online={isOnline} />
        </div>

        {/* Credenciais Meta Cloud API */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Credenciais da Cloud API
            </p>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground font-mono">graph.facebook.com / v21.0</span>
          </div>

          <SecretRow
            label="Phone Number ID"
            value={maskToken(integration.phone_number_id, 4, 4)}
            onCopy={() => handleCopy(integration.phone_number_id, "Phone Number ID")}
            copied={copied}
          />
          <SecretRow
            label="WABA ID (WhatsApp Business Account)"
            value={maskToken(integration.waba_id, 4, 4)}
            onCopy={() => handleCopy(integration.waba_id, "WABA ID")}
            copied={copied}
          />
          <SecretRow
            label="Access Token (System User)"
            value={maskToken(integration.access_token, 6, 4)}
            onCopy={() => handleCopy(integration.access_token, "Access Token")}
            copied={copied}
          />
        </div>

        <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>
            Credenciais criptografadas e isoladas por filial · Última sincronização: {integration.last_sync}
          </span>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
          {isOnline ? (
            <>
              <Button variant="outline" onClick={handleConnect} className="gap-2">
                <Link2 className="h-4 w-4" />
                Reconectar Conta Meta
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} className="gap-2">
                <Power className="h-4 w-4" />
                Revogar Acesso
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} className="gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white">
              <MetaGlyph className="h-4 w-4" />
              Conectar Conta Meta Business
            </Button>
          )}
        </div>
      </SectionCard>

      {/* Templates de Mensagem */}
      <SectionCard
        title="Templates de Mensagem"
        description="Mensagens ativas exigem templates pré-aprovados pela Meta (HSM)."
        icon={<FileText className="h-5 w-5 text-muted-foreground" />}
      >
        <div className="grid grid-cols-2 gap-3">
          <TemplateStat
            label="Aprovados"
            value={approved.length}
            tone="success"
            hint="Prontos para uso"
          />
          <TemplateStat
            label="Em análise"
            value={inReview.length}
            tone="warn"
            hint="Aguardando Meta"
          />
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {MOCK_TEMPLATES.map((t) => (
            <li
              key={t.name}
              className="flex items-center justify-between px-3 py-2.5 bg-card"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md shrink-0",
                    t.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {t.status === "approved" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-xs text-foreground truncate">{t.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t.category}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  t.status === "approved"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {t.status === "approved" ? "Aprovado" : "Em análise"}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <p className="text-[11px] text-muted-foreground px-1">
        Credenciais persistidas em colunas isoladas (
        <code className="font-mono">phone_number_id</code>,{" "}
        <code className="font-mono">waba_id</code>,{" "}
        <code className="font-mono">access_token</code>) na tabela{" "}
        <code className="font-mono">stores</code>.
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
  rightSlot,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <header className="flex items-start gap-3">
        {icon && <div className="mt-0.5">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
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

function maskToken(token: string, prefix = 6, suffix = 4) {
  if (token.length <= prefix + suffix + 2) return token;
  return `${token.slice(0, prefix)}••••••••${token.slice(-suffix)}`;
}

/** Selo "Official API Integration" — passa confiança enterprise. */
function OfficialApiBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1877F2]/30 bg-[#1877F2]/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#1877F2] dark:text-[#4F8EF7]">
      <MetaGlyph className="h-3 w-3" />
      Official API Integration
    </span>
  );
}

/** Cartão de estatística para templates (aprovados / em análise). */
function TemplateStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "success" | "warn";
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
      : "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5";
  const valueColor =
    tone === "success"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-amber-700 dark:text-amber-400";
  return (
    <div className={cn("rounded-xl border p-3", styles)}>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-2xl font-semibold tabular-nums tracking-tight", valueColor)}>
          {value}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

/** Glyph "Meta" — losango infinito simplificado. */
function MetaGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 4.5C8.4 4.5 6 7.5 6 11.2c0 2.6 1.2 4.6 3 4.6 1.5 0 2.5-1 4.2-3.8L14.6 10c.7-1.1 1.3-1.7 2-1.7 1.1 0 1.9 1 1.9 2.8 0 1.6-.6 2.7-1.4 2.7-.4 0-.7-.2-1-.7l-.7 1.6c.5.7 1.3 1.1 2.2 1.1 2.1 0 3.6-2.1 3.6-5 0-3.5-1.9-5.8-4.4-5.8-1.6 0-2.8.9-3.9 2.4l-.7 1c-1.5 2.2-2.1 2.9-2.7 2.9-.7 0-1.3-.7-1.3-2.4 0-2.2 1.1-4.2 3-4.2 1 0 1.7.4 2.4 1.1l1-1.5C14.6 5 13.4 4.5 12 4.5z" />
    </svg>
  );
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
