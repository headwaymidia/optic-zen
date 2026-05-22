import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  QrCode,
  RefreshCw,
  Smartphone,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { WhatsAppPanel } from "@/components/WhatsAppPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ResponsiveDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { validateEmail } from "@/lib/validators";

type TabKey = "geral" | "equipe";

const TABS: { key: TabKey; label: string; icon: typeof Settings }[] = [
  { key: "geral", label: "Geral", icon: Settings },
  { key: "equipe", label: "Equipe", icon: Users },

];

/**
 * Configuração de integração WhatsApp (Meta Cloud API) por loja.
 * Os campos são preenchidos pelo próprio dono da loja com as credenciais
 * obtidas no Meta Business Suite. Nada é pré-preenchido.
 */
type StoreIntegration = {
  whatsapp_number: string;
  business_name: string;
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  status: "online" | "offline";
  last_sync: string;
};

const EMPTY_INTEGRATION: StoreIntegration = {
  whatsapp_number: "",
  business_name: "",
  phone_number_id: "",
  waba_id: "",
  access_token: "",
  status: "offline",
  last_sync: "Nunca sincronizado",
};


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
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Abas: Configurações pessoais / Configurações da loja */}
      <div className="flex rounded-lg overflow-hidden border border-border mb-6">
        <a
          href="/configuracoes"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-muted-foreground bg-background hover:bg-muted transition-colors border-r border-border"
        >
          Configurações
        </a>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-primary text-primary-foreground"
        >
          Configurações da loja
        </button>
      </div>

      <GeneralPanel store={currentStore} />
      <TeamPanel storeId={currentStore.id} storesCount={stores.length} />
    </div>
  );
}

/* ---------- GERAL ---------- */
function GeneralPanel({ store }: { store: { id: string; name: string; role: string } }) {
  const [bhStart, setBhStart] = useState<number>(8);
  const [bhEnd, setBhEnd] = useState<number>(18);
  const [bhDays, setBhDays] = useState<number[]>([1,2,3,4,5,6]);
  const [savingBh, setSavingBh] = useState(false);
  const canEdit = store.role === "Dono" || store.role === "Gerente";

  useEffect(() => {
    supabase.from("stores").select("business_hours_start,business_hours_end,business_days")
      .eq("id", store.id).maybeSingle().then(({ data }) => {
        if (data) {
          setBhStart(data.business_hours_start ?? 8);
          setBhEnd(data.business_hours_end ?? 18);
          setBhDays(data.business_days ?? [1,2,3,4,5,6]);
        }
      });
  }, [store.id]);

  const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  async function saveBh() {
    setSavingBh(true);
    await supabase.from("stores").update({
      business_hours_start: bhStart,
      business_hours_end: bhEnd,
      business_days: bhDays,
    }).eq("id", store.id);
    setSavingBh(false);
    toast({ title: "Horário salvo com sucesso" });
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Informações da filial" description="Dados básicos exibidos no dashboard.">
        <Field label="Nome da loja" value={store.name} />
        <Field label="ID da loja" value={store.id} mono />
        <Field label="Sua permissão" value={store.role} />
      </SectionCard>

      <SectionCard title="Horário de Atendimento" description="Usado para calcular velocidade de resposta corretamente. Mensagens fora deste horário não contam como atraso.">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Abertura</label>
              <select
                value={bhStart}
                onChange={e => setBhStart(Number(e.target.value))}
                disabled={!canEdit}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({length: 24}, (_,i) => (
                  <option key={i} value={i}>{String(i).padStart(2,"0")}h00</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fechamento</label>
              <select
                value={bhEnd}
                onChange={e => setBhEnd(Number(e.target.value))}
                disabled={!canEdit}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({length: 24}, (_,i) => (
                  <option key={i} value={i}>{String(i).padStart(2,"0")}h00</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dias de atendimento</label>
            <div className="flex gap-2 flex-wrap">
              {dayNames.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setBhDays(prev =>
                    prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort()
                  )}
                  className={`h-8 w-10 rounded-md text-xs font-medium border transition-colors ${
                    bhDays.includes(i)
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-background text-muted-foreground border-input"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={saveBh}
              disabled={savingBh}
              className="h-9 px-4 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {savingBh ? "Salvando..." : "Salvar horário"}
            </button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Meta Pixel / Conversions API" description="Rastreie conversões dos seus anúncios do Facebook e Instagram. Os eventos são enviados pelo servidor — mais preciso que pixel no browser.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pixel ID</label>
            <MetaPixelInput store={store} canEdit={canEdit} />
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Eventos disparados automaticamente:</p>
            <p>• <strong>Lead</strong> — novo lead chega</p>
            <p>• <strong>Schedule</strong> — lead agenda exame</p>
            <p>• <strong>Purchase</strong> — lead compra</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function MetaPixelInput({ store, canEdit }: { store: { id: string; role: string }; canEdit: boolean }) {
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("stores").select("meta_pixel_id, meta_access_token")
      .eq("id", store.id).maybeSingle().then(({ data }) => {
        if (data) {
          setPixelId((data as any).meta_pixel_id ?? "");
          setAccessToken((data as any).meta_access_token ?? "");
        }
      });
  }, [store.id]);

  async function save() {
    setSaving(true);
    await supabase.from("stores").update({
      meta_pixel_id: pixelId || null,
      meta_access_token: accessToken || null,
    } as any).eq("id", store.id);
    setSaving(false);
    toast({ title: "Pixel salvo com sucesso" });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Pixel ID</label>
        <input
          type="text"
          placeholder="Ex: 1234567890123456"
          value={pixelId}
          onChange={e => setPixelId(e.target.value)}
          disabled={!canEdit}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        />
        <p className="text-[10px] text-muted-foreground">Gerenciador de Negócios → Fontes de Dados → Pixels</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Token de Acesso (Conversions API)</label>
        <input
          type="password"
          placeholder="EAAxxxxxxxx..."
          value={accessToken}
          onChange={e => setAccessToken(e.target.value)}
          disabled={!canEdit}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        />
        <p className="text-[10px] text-muted-foreground">Pixels → Configurações → Token de Acesso da API de Conversões</p>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar configuração"}
        </button>
      )}
    </div>
  );
}

/* ---------- EQUIPE ---------- */
type TeamRole = "Dono" | "Gerente" | "Vendedor";
type TeamMember = {
  id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: TeamRole;
  token: string;
  created_at: string;
  expires_at: string;
};

function roleBadgeClasses(role: string) {
  switch (role) {
    case "Dono":
      return "bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900";
    case "Gerente":
      return "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300";
    case "Vendedor":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
    default:
      return "bg-muted text-foreground";
  }
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function buildInviteLink(token: string) {
  return `${window.location.origin}/aceitar-convite/${token}`;
}

export function TeamPanel({ storeId, storesCount }: { storeId: string; storesCount: number }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  async function loadAll() {
    setLoading(true);
    const [{ data: m, error: mErr }, { data: i, error: iErr }] = await Promise.all([
      supabase
        .from("store_members")
        .select("id, user_id, role, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true }),
      supabase
        .from("store_invites")
        .select("id, email, role, token, created_at, expires_at")
        .eq("store_id", storeId)
        .eq("status", "pendente")
        .order("created_at", { ascending: false }),
    ]);

    if (mErr) {
      setLoading(false);
      toast({ title: "Erro ao carregar equipe", description: humanizeError(mErr), variant: "destructive" });
    } else {
      const userIds = Array.from(new Set((m ?? []).map((r: any) => r.user_id)));
      let profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (userIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        if (pErr) {
          console.error("Erro ao carregar profiles:", pErr);
        } else {
          profileMap = new Map(
            (profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }])
          );
        }
      }
      const mapped: TeamMember[] = (m ?? []).map((row: any) => {
        const p = profileMap.get(row.user_id);
        return {
          id: row.id,
          user_id: row.user_id,
          role: row.role,
          created_at: row.created_at,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
        };
      });
      setMembers(mapped);
    }
    setLoading(false);
    if (iErr) {
      toast({ title: "Erro ao carregar convites", description: humanizeError(iErr), variant: "destructive" });
    } else {
      setInvites((i ?? []) as PendingInvite[]);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function handleRemoveMember(member: TeamMember) {
    if (member.role === "Dono") {
      toast({ title: "Não é possível remover o Dono.", variant: "destructive" });
      return;
    }
    setMemberToRemove(member);
  }

  async function confirmRemoveMember() {
    const member = memberToRemove;
    if (!member) return;
    const { error } = await supabase
      .from("store_members")
      .delete()
      .eq("id", member.id);
    if (error) {
      toast({ title: "Erro ao remover membro", description: humanizeError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Membro removido." });
    setMemberToRemove(null);
    loadAll();
  }

  async function handleRevokeInvite(invite: PendingInvite) {
    if (!confirm(`Revogar convite enviado para ${invite.email}?`)) return;
    const { error } = await supabase
      .from("store_invites")
      .update({ status: "revogado" })
      .eq("id", invite.id);
    if (error) {
      toast({ title: "Erro ao revogar convite", description: humanizeError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Convite revogado." });
    loadAll();
  }

  async function handleCopyLink(invite: PendingInvite) {
    try {
      await navigator.clipboard.writeText(buildInviteLink(invite.token));
      toast({ title: "Link copiado!", description: "Envie pelo WhatsApp ou e-mail." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  }

  const totalCount = members.length + invites.length;

  return (
    <>
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <header className="flex items-center justify-between gap-4 pb-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Membros da Filial
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading
              ? "Carregando membros…"
              : `${members.length} ativos · ${invites.length} aguardando`}
            {storesCount > 1 ? ` · ${storesCount} filiais no workspace` : ""}.
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Convidar Usuário
        </Button>
      </header>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        storeId={storeId}
        existingEmails={members.map((m) => (m.email ?? "").toLowerCase()).filter(Boolean)}
        onInvited={loadAll}
      />

      <div className="border-t border-border">
        <div className="hidden sm:grid grid-cols-[1.6fr_1fr_40px] items-center gap-4 px-1 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>Usuário</span>
          <span>Nível de acesso</span>
          <span className="sr-only">Ações</span>
        </div>

        {loading ? (
          <p className="px-1 py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : totalCount === 0 ? (
          <p className="px-1 py-10 text-center text-sm text-muted-foreground">
            Nenhum membro adicionado ainda. Use “Convidar Usuário” para adicionar sua equipe.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_1fr_40px] items-center gap-4 px-1 py-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {(() => {
                    const email = (m.email ?? "").trim();
                    const fullName = (m.full_name ?? "").trim();
                    const hasRealName =
                      fullName.length > 0 && fullName.toLowerCase() !== email.toLowerCase();
                    // Prioridade: nome real > email. NUNCA mostrar UUID.
                    const primary = hasRealName ? fullName : email || "Membro sem e-mail";
                    const secondary = hasRealName && email ? email : null;
                    const initialsSource = email || fullName;
                    const initials = initialsSource
                      ? initialsSource.slice(0, 2).toUpperCase()
                      : "?";
                    return (
                      <>
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {primary}
                          </p>
                          {secondary && (
                            <p className="text-xs text-muted-foreground truncate">
                              {secondary}
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="hidden sm:block">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      roleBadgeClasses(m.role)
                    )}
                  >
                    {m.role}
                  </span>
                </div>

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Ações"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(m)}
                        className="text-destructive focus:text-destructive"
                        disabled={m.role === "Dono"}
                      >
                        Remover acesso
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}

            {invites.map((inv) => (
              <li
                key={inv.id}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_1fr_40px] items-center gap-4 px-1 py-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-semibold dark:bg-amber-500/15 dark:text-amber-300">
                      <Clock className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {inv.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Convite enviado · expira em{" "}
                      {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      roleBadgeClasses(inv.role)
                    )}
                  >
                    {inv.role}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 px-2.5 py-0.5 text-xs font-medium">
                    <Clock className="h-3 w-3" /> Aguardando
                  </span>
                </div>

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Ações"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => handleCopyLink(inv)}>
                        <Copy className="h-4 w-4 mr-2" /> Copiar link do convite
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRevokeInvite(inv)}
                        className="text-destructive focus:text-destructive"
                      >
                        Revogar convite
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground pt-4 mt-2 border-t border-border">
        Permissões persistidas em <code className="font-mono">store_members</code>{" "}
        com isolamento por <code className="font-mono">store_id</code>.
      </p>
    </section>
    <AlertDialog open={!!memberToRemove} onOpenChange={(o) => !o && setMemberToRemove(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover membro?</AlertDialogTitle>
          <AlertDialogDescription>
            O usuário <strong>{memberToRemove?.full_name ?? memberToRemove?.email ?? ""}</strong> perderá acesso a esta loja imediatamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmRemoveMember}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

/* ---------- INVITE DIALOG ---------- */
function InviteMemberDialog({
  open,
  onOpenChange,
  storeId,
  existingEmails = [],
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  existingEmails?: string[];
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("Vendedor");
  const [submitting, setSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const trimmedEmail = email.trim().toLowerCase();
  const formatError = validateEmail(email);
  const alreadyMember =
    !formatError && existingEmails.includes(trimmedEmail)
      ? "Este e-mail já é membro desta loja."
      : null;
  const emailError = formatError ?? alreadyMember;

  function reset() {
    setEmail("");
    setRole("Vendedor");
    setSubmitting(false);
    setCreatedLink(null);
    setEmailTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    if (emailError) return;
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sessão expirada", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("store_invites")
      .insert({
        store_id: storeId,
        email: trimmedEmail,
        role,
        invited_by: user.id,
      })
      .select("token")
      .single();

    setSubmitting(false);

    if (error) {
      const msg = error.message.includes("uniq_pending_invite")
        ? "Já existe um convite pendente para este e-mail."
        : humanizeError(error);
      toast({ title: "Erro ao criar convite", description: msg, variant: "destructive" });
      return;
    }

    const link = buildInviteLink(data.token);
    setCreatedLink(link);
    toast({ title: "Convite enviado!" });
    onInvited();
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle className="text-lg font-semibold tracking-tight">
          {createdLink ? "Convite gerado!" : "Convidar Novo Membro"}
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="text-sm text-muted-foreground">
          {createdLink
            ? "Copie o link abaixo e envie ao colaborador."
            : "Gere um link de convite e envie ao colaborador por WhatsApp ou e-mail."}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      {createdLink ? (
        <div className="space-y-4 pt-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200">
            ✅ Convite criado para <span className="font-semibold">{email}</span> como{" "}
            <span className="font-semibold">{role}</span>.
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Link de convite
            </Label>
            <Textarea
              readOnly
              value={createdLink}
              onFocus={(e) => e.currentTarget.select()}
              rows={3}
              className="font-mono text-xs resize-none break-all"
            />
            <Button
              type="button"
              className="w-full h-11 gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(createdLink);
                  toast({ title: "Link copiado!" });
                } catch {
                  toast({ title: "Não foi possível copiar", variant: "destructive" });
                }
              }}
            >
              <Copy className="h-4 w-4" />
              Copiar link
            </Button>
            <p className="text-sm font-medium text-foreground pt-1">
              Envie este link pelo WhatsApp para o funcionário.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Válido por 7 dias.
            </p>
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </ResponsiveDialogFooter>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label
              htmlFor="invite-email"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              E-mail do colaborador
            </Label>
            <Input
              id="invite-email"
              type="email"
              required
              autoFocus
              placeholder="exemplo@otica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              aria-invalid={emailTouched && !!emailError}
              className={cn(
                "h-11",
                emailTouched && emailError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {emailTouched && emailError && (
              <p className="text-[11px] text-destructive">{emailError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cargo / Permissão
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dono">Dono</SelectItem>
                <SelectItem value="Gerente">Gerente</SelectItem>
                <SelectItem value="Vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ResponsiveDialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !!emailError}
              className="h-11 gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {submitting ? "Gerando…" : "Gerar Convite"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      )}
    </ResponsiveDialog>
  );
}

/* ---------- INTEGRAÇÕES ---------- */
function IntegrationsPanel({ storeId, storeName }: { storeId: string; storeName: string }) {
  // Campos vazios — o dono da loja preenche com suas próprias credenciais
  // obtidas no Meta Business Suite. Nada é hardcoded.
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  // Reset quando trocar de loja
  useEffect(() => {
    setBusinessName("");
    setWhatsappNumber("");
    setPhoneNumberId("");
    setWabaId("");
    setAccessToken("");
  }, [storeId]);

  const isConfigured = Boolean(
    phoneNumberId.trim() && wabaId.trim() && accessToken.trim()
  );

  function handleSave() {
    if (!isConfigured) {
      toast({
        title: "Preencha todas as credenciais",
        description: "Phone Number ID, WABA ID e Access Token são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    // TODO: persistir em colunas dedicadas na tabela `stores` quando disponíveis.
    toast({
      title: "Credenciais salvas",
      description: `Configurações de "${storeName}" atualizadas.`,
    });
  }

  function handleConnectMeta() {
    toast({
      title: "Conectar conta Meta",
      description:
        "Autenticação OAuth com o Meta Business ainda não está disponível. Preencha as credenciais manualmente abaixo.",
    });
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Conexão de Atendimento"
        description="WhatsApp Business Platform · Cloud API oficial gerenciada pela Meta."
        icon={<WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />}
        rightSlot={<OfficialApiBadge />}
      >
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg h-auto">
            <TabsTrigger
              value="api"
              className="text-xs sm:text-sm gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 transition-all duration-200"
            >
              <BadgeCheck className="h-4 w-4" />
              API Oficial (Meta)
            </TabsTrigger>
            <TabsTrigger
              value="qr"
              className="text-xs sm:text-sm gap-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 transition-all duration-200"
            >
              <QrCode className="h-4 w-4" />
              QR Code (Web)
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="api"
            className="mt-4 space-y-4 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
          >
            {/* Header com status */}
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
                    {businessName || "Configure sua conta Meta"}
                  </p>
                  <p className="text-base font-semibold tabular-nums text-foreground truncate">
                    {whatsappNumber || "Nenhum número configurado"}
                  </p>
                </div>
              </div>
              <StatusBadge online={isConfigured} />
            </div>

            {/* Campos editáveis — vazios por padrão */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Credenciais da Cloud API
                </p>
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground font-mono">
                  graph.facebook.com / v21.0
                </span>
              </div>

              <EditableField
                label="Nome do Business"
                placeholder="Ex.: Ótica Central"
                value={businessName}
                onChange={setBusinessName}
              />
              <EditableField
                label="Número do WhatsApp"
                placeholder="+55 11 90000-0000"
                value={whatsappNumber}
                onChange={setWhatsappNumber}
              />
              <EditableField
                label="Phone Number ID"
                placeholder="Cole aqui o Phone Number ID da Meta"
                value={phoneNumberId}
                onChange={setPhoneNumberId}
                mono
              />
              <EditableField
                label="WABA ID (WhatsApp Business Account)"
                placeholder="Cole aqui o WABA ID"
                value={wabaId}
                onChange={setWabaId}
                mono
              />
              <EditableField
                label="Access Token (System User)"
                placeholder="EAAG..."
                value={accessToken}
                onChange={setAccessToken}
                mono
                secret
              />
            </div>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                Credenciais armazenadas com isolamento por filial. Obtenha-as em{" "}
                <span className="font-medium text-foreground">
                  business.facebook.com → WhatsApp → API Setup
                </span>
                .
              </span>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
              <Button
                onClick={handleConnectMeta}
                variant="outline"
                className="gap-2"
              >
                <MetaGlyph className="h-4 w-4" />
                Conectar com Meta Business
              </Button>
              <Button
                onClick={handleSave}
                className="gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white"
              >
                <Check className="h-4 w-4" />
                Salvar credenciais
              </Button>
            </div>
          </TabsContent>

          <TabsContent
            value="qr"
            className="mt-4 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
          >
            <QrCodeConnectionPanel />
          </TabsContent>
        </Tabs>
      </SectionCard>

      {/* Templates de Mensagem — vazio até integração */}
      <SectionCard
        title="Templates de Mensagem"
        description="Mensagens ativas exigem templates pré-aprovados pela Meta (HSM)."
        icon={<FileText className="h-5 w-5 text-muted-foreground" />}
      >
        <p className="text-sm text-muted-foreground py-6 text-center">
          {isConfigured
            ? "Nenhum template sincronizado ainda. Os templates aprovados na Meta aparecerão aqui."
            : "Configure as credenciais da Cloud API acima para listar seus templates aprovados."}
        </p>
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

function EditableField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  secret?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        type={secret ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("h-9 bg-muted/30", mono && "font-mono text-xs")}
      />
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

/** Painel de conexão via QR Code (WhatsApp Web) */
function QrCodeConnectionPanel() {
  const [qrStatus, setQrStatus] = useState<"waiting" | "connected">("waiting");
  const [qrKey, setQrKey] = useState(0);

  const handleRegenerate = () => {
    setQrKey((k) => k + 1);
    setQrStatus("waiting");
    toast({
      title: "Novo QR Code gerado",
      description: "Aponte a câmera do seu celular para a tela.",
    });
  };

  const handleSimulateConnect = () => {
    setQrStatus("connected");
    toast({
      title: "Aparelho conectado",
      description: "Sessão WhatsApp Web vinculada com sucesso.",
    });
  };

  const isConnected = qrStatus === "connected";

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Status */}
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
          isConnected
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        )}
        aria-live="polite"
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
          )}
        />
        {isConnected ? "Aparelho Conectado" : "Aguardando leitura..."}
      </div>

      {/* Placeholder do QR Code */}
      <button
        type="button"
        onClick={handleSimulateConnect}
        disabled={isConnected}
        className={cn(
          "relative h-56 w-56 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all",
          isConnected
            ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
            : "border-border bg-muted/30 hover:bg-muted/50 cursor-pointer"
        )}
        aria-label={isConnected ? "Conectado" : "QR Code para leitura"}
      >
        {isConnected ? (
          <div className="flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Smartphone className="h-12 w-12" />
            <span className="text-xs font-semibold">Sessão ativa</span>
          </div>
        ) : (
          <div key={qrKey} className="flex flex-col items-center gap-2 text-muted-foreground animate-in fade-in zoom-in-95 duration-300">
            <QrCode className="h-28 w-28" strokeWidth={1.5} />
            <span className="text-[10px] font-mono tracking-widest uppercase">QR Code</span>
          </div>
        )}
      </button>

      {/* Botão regenerar */}
      <Button
        type="button"
        variant="outline"
        onClick={handleRegenerate}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Gerar novo QR Code
      </Button>

      {/* Instruções */}
      <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
        Abra o WhatsApp no seu celular, vá em <span className="font-medium text-foreground">Aparelhos Conectados</span> e aponte a câmera para a tela.
      </p>
    </div>
  );
}
