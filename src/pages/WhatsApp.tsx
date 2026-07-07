import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParams } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { useStores } from "@/hooks/useStores";
import { useStoreMembers } from "@/hooks/useStoreMembers";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatPanel } from "@/components/ChatPanel";
import { Search, MessageSquarePlus, MessageCircle, CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

type PeriodKey = "all" | "today" | "7d" | "month" | "custom";

function getPeriodRange(key: PeriodKey, custom?: DateRange): { from: Date; to: Date } | null {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  if (key === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (key === "7d") {
    const from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    return { from, to: endOfDay(now) };
  }
  if (key === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  }
  if (key === "custom" && custom?.from) {
    return { from: startOfDay(custom.from), to: endOfDay(custom.to ?? custom.from) };
  }
  return null;
}
import { DataSkeleton } from "@/components/ui/DataSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { maskPhone } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

const INTEREST_TAG_STYLES: Record<string, string> = {
  Exame: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Multifocal: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  Solar: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "Lentes de Contato": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  Armação: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  Infantil: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
};

const SOURCE_EMOJI: Record<string, string> = {
  Instagram: "📸",
  "Google Ads": "🔎",
  WhatsApp: "💬",
  Indicação: "🤝",
  Facebook: "👍",
  "Loja Física": "🏬",
  Outro: "🔗",
};

function formatLeadTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeShort(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "ontem";
  if (day < 7) return `há ${day}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function truncate(text: string, max = 40) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function formatBRPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return maskPhone(d);
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function WhatsAppPage() {
  usePageTitle("Atendimentos");
  const { leads, loading, updateLead, hasMore, loadMore, isFetchingMore } = useLeads();
  const { currentStoreId } = useStores();
  const [search, setSearch] = useState("");
  const STORAGE_KEY = currentStoreId ? `wa-last-lead-${currentStoreId}` : null;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Restaura a conversa ao carregar/voltar para a pagina.
  // Prioridade: ?lead= na URL (sobrevive a navegacao/back do navegador) > localStorage.
  useEffect(() => {
    if (!STORAGE_KEY) return;
    const fromUrl = new URLSearchParams(window.location.search).get("lead");
    if (fromUrl) {
      setSelectedId(fromUrl);
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSelectedId(saved);
    } catch {}
  }, [STORAGE_KEY]);

  // Salva último lead aberto no localStorage para restaurar ao voltar
  // Fecha a vista do chat SEM esquecer a conversa: mantem o localStorage para
  // que, ao ir para Agenda/outra pagina e voltar, a mesma conversa reabra.
  const closeChatKeepMemory = () => {
    setSelectedId(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("lead");
      window.history.replaceState(window.history.state, "", url);
    } catch {}
  };

  const setSelectedIdPersist = (id: string | null) => {
    setSelectedId(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY!, id);
      else localStorage.removeItem(STORAGE_KEY!);
    } catch {}
    // Mantem a conversa na URL: navegar para outra pagina e voltar (ou usar o
    // botao "voltar" do navegador) reabre a mesma conversa sem procurar de novo.
    try {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("lead", id);
      else url.searchParams.delete("lead");
      window.history.replaceState(window.history.state, "", url);
    } catch {}
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string>("");
  const [newChatSearch, setNewChatSearch] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const { members } = useStoreMembers(currentStoreId ?? undefined);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customOpen, setCustomOpen] = useState(false);

  // Deep-link: open chat for leadId from query string (e.g. coming from Tarefas)
  useEffect(() => {
    const leadIdFromUrl = searchParams.get("leadId");
    if (leadIdFromUrl && leads.some((l) => l.id === leadIdFromUrl)) {
      setSelectedIdPersist(leadIdFromUrl);
      // Mensagem de lembrete via URL params ou localStorage
      const messageFromUrl = searchParams.get("message");
      if (messageFromUrl) {
        setDraftMessage(decodeURIComponent(messageFromUrl));
      } else {
        const savedLeadId = localStorage.getItem("od_draft_lead_id");
        const savedMsg = localStorage.getItem("od_draft_message");
        if (savedLeadId === leadIdFromUrl && savedMsg) {
          setDraftMessage(savedMsg);
          localStorage.removeItem("od_draft_message");
          localStorage.removeItem("od_draft_lead_id");
        }
      }
      // Clean the URL so refresh doesn't keep re-selecting
      searchParams.delete("leadId");
      searchParams.delete("message");
      setSearchParams(searchParams, { replace: true });
    }
  }, [leads, searchParams, setSearchParams]);

  // Mobile: when a chat is open, hide BottomNav + main pb-20 for true fullscreen chat
  useEffect(() => {
    if (selectedId) {
      document.body.setAttribute("data-chat-fullscreen", "true");
      document.querySelector("main")?.scrollTo({ top: 0, left: 0 });
    } else {
      document.body.removeAttribute("data-chat-fullscreen");
    }
    return () => document.body.removeAttribute("data-chat-fullscreen");
  }, [selectedId]);

  const filtered = useMemo(() => {
    const range = getPeriodRange(period, customRange);
    const ts = (l: typeof leads[number]) => {
      const ref = l.last_message_at ?? l.created_at;
      return ref ? new Date(ref).getTime() : -Infinity;
    };
    const seen = new Set();
    const uniqueLeads = leads.filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
    return uniqueLeads
      .filter((l) => {
        const term = search.toLowerCase();
        const phoneMatch = (l.phone ?? "").replace(/\D/g, "").includes(search.replace(/\D/g, ""));
        if (term && !l.name.toLowerCase().includes(term) && !phoneMatch) return false;
        if (statusFilter !== "all" && l.status !== statusFilter) return false;
        if (sellerFilter !== "all" && (l.responsible_id ?? "") !== sellerFilter) return false;
        if (range) {
          const ref = l.last_message_at ?? l.created_at;
          const t = ref ? new Date(ref).getTime() : 0;
          if (t < range.from.getTime() || t > range.to.getTime()) return false;
        }
        return true;
      })
      .sort((a, b) => ts(b) - ts(a));
  }, [leads, search, period, customRange]);

  const customLabel = customRange?.from
    ? customRange.to && customRange.to.getTime() !== customRange.from.getTime()
      ? `${format(customRange.from, "dd/MM", { locale: ptBR })} – ${format(customRange.to, "dd/MM", { locale: ptBR })}`
      : format(customRange.from, "dd/MM/yyyy", { locale: ptBR })
    : "Selecionar datas";

  // Fallback: se o lead selecionado nao esta nas paginas carregadas (paginacao/filtros),
  // busca direto pelo id — assim a conversa reabre mesmo que o lead nao esteja na 1a pagina.
  const [fallbackLead, setFallbackLead] = useState<(typeof leads)[number] | null>(null);
  // Sinal estavel (boolean) para o efeito nao re-executar a cada re-render
  // (o array `leads` muda de identidade em todo render do hook).
  const selectedInList = !!selectedId && leads.some((l) => l.id === selectedId);
  useEffect(() => {
    if (!selectedId || !currentStoreId || loading) { return; }
    if (selectedInList) { setFallbackLead(null); return; }
    let active = true;
    supabase
      .from("leads")
      .select("*")
      .eq("id", selectedId)
      .eq("store_id", currentStoreId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setFallbackLead((data as (typeof leads)[number]) ?? null);
      });
    return () => { active = false; };
  }, [selectedId, currentStoreId, loading, selectedInList]);

  const selected =
    leads.find((l) => l.id === selectedId) ??
    (fallbackLead && fallbackLead.id === selectedId ? fallbackLead : null);

  return (
    <div className="flex h-full max-h-full min-h-0 w-full overflow-hidden bg-background" data-chat={selected ? "open" : "closed"}>
      <aside
        className={cn(
          "w-full md:w-[320px] md:shrink-0 border-r flex flex-col bg-card min-h-0",
          selected && "hidden md:flex"
        )}
      >
        <div className="p-4 border-b space-y-3">
          <h1 className="text-lg font-semibold">Atendimentos</h1>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contato..."
                className="pl-9 bg-muted/50 border-0"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { setNewChatSearch(""); setNewChatOpen(true); }}
                  aria-label="Nova Conversa"
                  className="shrink-0"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nova Conversa</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs bg-muted/50 border-0 w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Novo Lead">Novo Lead</SelectItem>
                <SelectItem value="Em Atendimento">Em Atendimento</SelectItem>
                <SelectItem value="Aguardando Resposta">Aguardando Resposta</SelectItem>
                <SelectItem value="Agendou Exame">Agendou Exame</SelectItem>
                <SelectItem value="Não Compareceu">Não Compareceu</SelectItem>
                <SelectItem value="Compareceu e Comprou">Comprou</SelectItem>
                <SelectItem value="Repescagem">Repescagem</SelectItem>
              </SelectContent>
            </Select>
            {members.length > 0 && (
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="h-8 text-xs bg-muted/50 border-0 w-[130px]">
                  <SelectValue placeholder="Vendedora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={period}
              onValueChange={(v) => {
                const next = v as PeriodKey;
                setPeriod(next);
                if (next === "custom") setCustomOpen(true);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-muted/50 border-0 flex-1">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="custom">Data personalizada</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <Popover open={customOpen} onOpenChange={setCustomOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 px-2.5 bg-muted/50 border-0 font-normal"
                  >
                    <CalendarRange className="h-3.5 w-3.5" />
                    {customLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={1}
                    locale={ptBR}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (hasMore && !isFetchingMore && el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
              loadMore();
            }
          }}
        >
          {loading && leads.length === 0 && (
            <div className="p-4">
              <DataSkeleton variant="row" count={8} className="[&>div]:h-14" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <EmptyState
              icon={MessageCircle}
              title="Nenhum atendimento ainda."
              description="Crie um novo lead para começar."
            />
          )}
          {filtered.map((lead) => {
            const lastMsgIso = lead.last_message_at ?? null;
            const previewText = lead.last_message_preview?.trim();
            const hasMessages = Boolean(lastMsgIso);
            const preview = hasMessages
              ? truncate(previewText || "", 40)
              : "Sem mensagens ainda";
            const timeLabel = hasMessages && lastMsgIso
              ? formatRelativeShort(lastMsgIso)
              : formatLeadTime(lead.created_at);
            const unreadCount = lead.unread_count ?? 0;
            const active = selectedId === lead.id;
            const showUnread = unreadCount > 0 && !active;
            return (
              <button
                key={lead.id}
                onClick={async () => {
                  setSelectedIdPersist(lead.id);
                  if ((lead.unread_count ?? 0) > 0) {
                    // Zera localmente de imediato para o badge sumir sem esperar o realtime
                    updateLead(lead.id, { unread_count: 0 });
                    supabase.rpc("reset_unread", { p_lead_id: lead.id }).then(() => {});
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/50 transition-colors text-left",
                  active && "bg-muted"
                )}
              >
                <Avatar className="h-11 w-11 shrink-0">
                  {(lead as any).avatar_url && <AvatarImage src={(lead as any).avatar_url} alt={lead.name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials(lead.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-medium text-sm truncate">{lead.name}</p>
                    </div>
                    {timeLabel && (
                      <span className={cn("text-[11px] shrink-0", showUnread ? "text-emerald-600 font-medium" : "text-muted-foreground")}>
                        {timeLabel}
                      </span>
                    )}
                  </div>
                  {lead.phone && (
                    <p className="text-[11px] text-muted-foreground truncate">{formatBRPhone(lead.phone)}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={cn("text-xs truncate", hasMessages ? "text-muted-foreground" : "text-muted-foreground/70")}>
                      {preview}
                    </p>
                    {lead.status === "Novo Lead" && !hasMessages && (
                      <Badge className="h-5 px-1.5 text-[11px] font-semibold bg-blue-500 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0">
                        NOVO
                      </Badge>
                    )}
                    {showUnread && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {isFetchingMore && (
            <div className="p-3">
              <DataSkeleton variant="row" count={3} className="[&>div]:h-14" />
            </div>
          )}
        </div>
      </aside>

      <section className={cn("flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden", !selected && "hidden md:flex")}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecione um contato para iniciar a conversa
          </div>
        ) : (
          <ChatPanel key={selected?.id} lead={selected} onBack={closeChatKeepMemory} chatOnly initialMessage={draftMessage} onDraftConsumed={() => setDraftMessage("")} />
        )}
      </section>


      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Iniciar Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="pl-9 bg-muted/50 border-0"
              />
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {leads
              .filter((l) => {
                const q = newChatSearch.toLowerCase().trim();
                if (!q) return true;
                return (
                  l.name.toLowerCase().includes(q) ||
                  (l.phone ?? "").toLowerCase().includes(q)
                );
              })
              .map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => {
                    setSelectedIdPersist(lead.id);
                    setNewChatOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {(lead as any).avatar_url && <AvatarImage src={(lead as any).avatar_url} alt={lead.name} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {initials(lead.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{lead.name}</p>
                      {lead.status && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-normal text-muted-foreground border-muted px-1.5 py-0 rounded-full"
                        >
                          {lead.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {lead.lead_source && (
                        <span aria-hidden title={`Origem: ${lead.lead_source}`}>
                          {SOURCE_EMOJI[lead.lead_source as string] ?? "🔗"}
                        </span>
                      )}
                      <span className="truncate">{lead.phone ?? "Sem telefone"}</span>
                    </p>
                    {lead.interest_tag && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                            INTEREST_TAG_STYLES[lead.interest_tag as string] ??
                              "bg-slate-100 text-slate-700"
                          )}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {lead.interest_tag}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            {leads.filter((l) => {
              const q = newChatSearch.toLowerCase().trim();
              if (!q) return true;
              return l.name.toLowerCase().includes(q) || (l.phone ?? "").toLowerCase().includes(q);
            }).length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhum contato encontrado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

