import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { KanbanBoard, CadenceFilter, countLeadsByPendingFu } from "@/components/KanbanBoard";
import { LeadDialog } from "@/components/LeadDialog";
import { useLeads } from "@/hooks/useLeads";
import { LEAD_STATUSES, LeadStatus } from "@/integrations/supabase/client";
import { useStoreMembers } from "@/hooks/useStoreMembers";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Search, X, CalendarRange } from "lucide-react";
import { DataSkeleton } from "@/components/ui/DataSkeleton";

type PeriodKey = "all" | "today" | "7d" | "month" | "custom";

function getPeriodRange(key: PeriodKey, custom?: DateRange): { from: Date; to: Date } | null {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  if (key === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (key === "7d") return { from: startOfDay(new Date(now.getTime() - 6 * 86400000)), to: endOfDay(now) };
  if (key === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  if (key === "custom" && custom?.from) return { from: startOfDay(custom.from), to: endOfDay(custom.to ?? custom.from) };
  return null;
}

const STATUS_DOT_COLORS: Record<LeadStatus, string> = {
  "Novo Lead": "bg-blue-500",
  "Em Atendimento": "bg-cyan-400",
  "Aguardando Resposta": "bg-amber-500",
  "Agendou Exame": "bg-purple-500",
  "Não Compareceu": "bg-orange-500",
  "Compareceu e Comprou": "bg-emerald-500",
  "Compareceu e Não Comprou": "bg-rose-500",
  Repescagem: "bg-indigo-500",
};

const ALL_SALES = "__all__";

export default function Funil() {
  usePageTitle("Funil de Vendas");
  const { leads, loading, loadAll } = useLeads();
  useEffect(() => { loadAll(); }, [loadAll]);
  const { members } = useStoreMembers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState<string>(ALL_SALES);
  const [cadence, setCadence] = useState<CadenceFilter>("all");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customOpen, setCustomOpen] = useState(false);
  const selected = leads.find((lead) => lead.id === selectedId) ?? null;

  const periodRange = useMemo(() => getPeriodRange(period, customRange), [period, customRange]);
  const hasFilters =
    search.trim().length > 0 ||
    salesFilter !== ALL_SALES ||
    cadence !== "all" ||
    period !== "all";

  function clearFilters() {
    setSearch("");
    setSalesFilter(ALL_SALES);
    setCadence("all");
    setPeriod("all");
    setCustomRange(undefined);
  }

  // Contagem de pendentes por etapa de FU (independente de filtros — visão de gestão)
  const fuCounts = useMemo(() => countLeadsByPendingFu(leads), [leads]);
  const fuTotalPending = fuCounts[1] + fuCounts[2] + fuCounts[3] + fuCounts[4] + fuCounts[5];

  // Conta totais filtrados (reflete o que o Kanban exibe)
  const counts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const onlyDigits = term.replace(/\D/g, "");
    const fromMs = periodRange?.from.getTime() ?? null;
    const toMs = periodRange?.to.getTime() ?? null;
    const filtered = leads.filter((l) => {
      if (salesFilter !== ALL_SALES && (l.responsible_id ?? "") !== salesFilter) return false;
      if (fromMs !== null) {
        const t = l.created_at ? new Date(l.created_at).getTime() : 0;
        if (t < fromMs || (toMs !== null && t > toMs)) return false;
      }
      if (term) {
        const nameMatch = l.name?.toLowerCase().includes(term);
        const phoneDigits = (l.phone ?? "").replace(/\D/g, "");
        const phoneMatch = onlyDigits.length > 0 && phoneDigits.includes(onlyDigits);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    });
    const map = {} as Record<LeadStatus, number>;
    LEAD_STATUSES.forEach((s) => {
      map[s] = filtered.filter((l) => l.status === s).length;
    });
    return map;
  }, [leads, search, salesFilter, periodRange]);

  const customLabel = customRange?.from
    ? customRange.to && customRange.to.getTime() !== customRange.from.getTime()
      ? `${format(customRange.from, "dd/MM", { locale: ptBR })} – ${format(customRange.to, "dd/MM", { locale: ptBR })}`
      : format(customRange.from, "dd/MM/yyyy", { locale: ptBR })
    : "Selecionar datas";

  return (
    <div className="h-full max-h-full flex flex-col lg:flex-row min-h-0 overflow-hidden">
      {/* Centro: Kanban + pipeline overview */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 flex-1 flex flex-col min-h-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Funil de vendas</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isMobile ? "Toque em um card para conversar." : "Arraste para mover · Clique para conversar."}
            </p>
          </div>

          {/* Pipeline overview — micro-cards por etapa */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 thin-scrollbar">
            {LEAD_STATUSES.map((s) => (
              <div
                key={s}
                className="shrink-0 min-w-[120px] w-[120px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-sm dark:shadow-none transition-shadow"
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT_COLORS[s])} />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{s}</span>
                </div>
                <p className="text-base font-bold text-slate-800 dark:text-white tabular-nums mt-0.5">
                  {loading ? "—" : counts[s]}
                </p>
              </div>
            ))}
          </div>

          {/* Toolbar: busca + filtro de vendedora */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome ou telefone..."
                className="pl-9 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
              />
            </div>
            <div className="hidden sm:flex gap-2 flex-1">
            <Select value={salesFilter} onValueChange={setSalesFilter}>
              <SelectTrigger className="h-9 w-full sm:w-56 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Vendedora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SALES}>Todas as Vendedoras</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={period}
              onValueChange={(v) => {
                const next = v as PeriodKey;
                setPeriod(next);
                if (next === "custom") setCustomOpen(true);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white">
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
            </div>
            {period === "custom" && (
              <Popover open={customOpen} onOpenChange={setCustomOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 px-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white font-normal"
                  >
                    <CalendarRange className="h-4 w-4" />
                    {customLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={isMobile ? 1 : 2}
                    locale={ptBR}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 gap-1.5 text-slate-500 hover:text-slate-900 animate-in fade-in duration-200"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Central de Cadência — filtros por etapa de Follow-up */}
          <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none overflow-x-auto thin-scrollbar">
            <Tabs value={String(cadence)} onValueChange={(v) => setCadence(v === "all" ? "all" : (Number(v) as CadenceFilter))}>
              <TabsList className="bg-slate-50 dark:bg-slate-900/50 h-auto min-h-[44px] inline-flex w-max gap-1 p-1">
                <FuTabTrigger value="all" label="Geral" count={fuTotalPending} isAll />
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <FuTabTrigger
                    key={n}
                    value={String(n)}
                    label={`Follow-up ${n}`}
                    count={fuCounts[n]}
                  />
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 min-h-0 -mx-4 sm:-mx-6">
            {loading && leads.length === 0 ? (
              <div className="px-4 sm:px-6 flex gap-3 overflow-x-auto thin-scrollbar">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-[280px]">
                    <DataSkeleton variant="card" count={4} className="[&>div]:h-24" />
                  </div>
                ))}
              </div>
            ) : (
              <KanbanBoard
                onSelectLead={(lead) => setSelectedId(lead.id)}
                selectedLeadId={selectedId}
                search={search}
                salesFilter={salesFilter === ALL_SALES ? null : salesFilter}
                cadenceFilter={cadence}
                createdFrom={periodRange?.from ?? null}
                createdTo={periodRange?.to ?? null}
              />
            )}
          </div>
        </div>
      </div>

      {/* Detalhes do lead — sem chat (chat completo só em /atendimentos) */}
      <LeadDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        lead={selected}
        onSaved={() => setSelectedId(null)}
      />
    </div>
  );
}

function FuTabTrigger({
  value,
  label,
  count,
  isAll,
}: {
  value: string;
  label: string;
  count: number;
  isAll?: boolean;
}) {
  const hasPending = !isAll && count > 0;
  return (
    <TabsTrigger
      value={value}
      className="relative gap-1.5 min-h-[44px] px-3 whitespace-nowrap data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:text-slate-300 dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
    >
      <span className="font-semibold">{label}</span>
      <span
        className={cn(
          "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
          hasPending
            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
            : isAll && count > 0
              ? "bg-primary/10 text-primary"
              : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
        )}
      >
        {count}
      </span>
      {hasPending && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
        />
      )}
    </TabsTrigger>
  );
}
