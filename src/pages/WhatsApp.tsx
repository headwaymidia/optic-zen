import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParams } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
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

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function WhatsAppPage() {
  usePageTitle("Atendimentos");
  const { leads, loading, updateLead } = useLeads();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customOpen, setCustomOpen] = useState(false);

  // Deep-link: open chat for leadId from query string (e.g. coming from Tarefas)
  useEffect(() => {
    const leadIdFromUrl = searchParams.get("leadId");
    if (leadIdFromUrl && leads.some((l) => l.id === leadIdFromUrl)) {
      setSelectedId(leadIdFromUrl);
      // Clean the URL so refresh doesn't keep re-selecting
      searchParams.delete("leadId");
      setSearchParams(searchParams, { replace: true });
    }
  }, [leads, searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const range = getPeriodRange(period, customRange);
    return leads.filter((l) => {
      if (!l.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (range) {
        const t = l.created_at ? new Date(l.created_at).getTime() : 0;
        if (t < range.from.getTime() || t > range.to.getTime()) return false;
      }
      return true;
    });
  }, [leads, search, period, customRange]);

  const customLabel = customRange?.from
    ? customRange.to && customRange.to.getTime() !== customRange.from.getTime()
      ? `${format(customRange.from, "dd/MM", { locale: ptBR })} – ${format(customRange.to, "dd/MM", { locale: ptBR })}`
      : format(customRange.from, "dd/MM/yyyy", { locale: ptBR })
    : "Selecionar datas";

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-3.5rem-5rem)] md:h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-background">
      <aside
        className={cn(
          "w-full md:w-[30%] md:min-w-[280px] md:max-w-[400px] border-r flex flex-col bg-card",
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
          <div className="flex items-center gap-2">
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

        <div className="flex-1 overflow-y-auto">
          {loading && leads.length === 0 && (
            <div className="p-4">
              <DataSkeleton variant="row" count={6} className="[&>div]:h-14" />
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
            const lastMsgIso = lead.last_message_at ?? lead.last_interaction ?? lead.last_inbound_at ?? null;
            const previewText = lead.last_message_preview?.trim();
            const hasMessages = Boolean(previewText);
            const preview = hasMessages
              ? truncate(previewText!, 40)
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
                  setSelectedId(lead.id);
                  if ((lead.unread_count ?? 0) > 0) {
                    await updateLead(lead.id, { unread_count: 0 } as any);
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
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={cn("text-xs truncate", hasMessages ? "text-muted-foreground" : "text-muted-foreground/70")}>
                      {preview}
                    </p>
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
        </div>
      </aside>

      <section className={cn("flex-1 flex flex-col min-w-0 min-h-0", !selected && "hidden md:flex")}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecione um contato para iniciar a conversa
          </div>
        ) : (
          <ChatPanel lead={selected} onBack={() => setSelectedId(null)} />
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
                    setSelectedId(lead.id);
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

