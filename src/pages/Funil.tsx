import { useMemo, useState } from "react";
import { KanbanBoard, CadenceFilter, countLeadsByPendingFu } from "@/components/KanbanBoard";
import { ChatPanel } from "@/components/ChatPanel";
import { useLeads } from "@/hooks/useLeads";
import { Lead, LEAD_STATUSES, LeadStatus, SALESPEOPLE } from "@/lib/supabase";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X } from "lucide-react";

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
  const { leads, loading } = useLeads();
  const [selected, setSelected] = useState<Lead | null>(null);
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState<string>(ALL_SALES);
  const [cadence, setCadence] = useState<CadenceFilter>("all");

  const hasFilters = search.trim().length > 0 || salesFilter !== ALL_SALES || cadence !== "all";

  function clearFilters() {
    setSearch("");
    setSalesFilter(ALL_SALES);
    setCadence("all");
  }

  // Contagem de pendentes por etapa de FU (independente de filtros — visão de gestão)
  const fuCounts = useMemo(() => countLeadsByPendingFu(leads), [leads]);
  const fuTotalPending = fuCounts[1] + fuCounts[2] + fuCounts[3] + fuCounts[4] + fuCounts[5];

  // Conta totais filtrados (reflete o que o Kanban exibe)
  const counts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const onlyDigits = term.replace(/\D/g, "");
    const filtered = leads.filter((l) => {
      if (salesFilter !== ALL_SALES && (l.assigned_to ?? "") !== salesFilter) return false;
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
  }, [leads, search, salesFilter]);

  return (
    <div className="h-full flex flex-col lg:flex-row min-h-0">
      {/* Centro: Kanban + pipeline overview */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 flex-1 flex flex-col min-h-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Funil de vendas</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {isMobile ? "Toque em um card para conversar." : "Arraste para mover · Clique para conversar."}
            </p>
          </div>

          {/* Pipeline overview — micro-cards por etapa */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 thin-scrollbar">
            {LEAD_STATUSES.map((s) => (
              <div
                key={s}
                className="shrink-0 min-w-[120px] w-[120px] bg-white border border-slate-100 rounded-lg px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT_COLORS[s])} />
                  <span className="text-[10px] text-slate-500 truncate">{s}</span>
                </div>
                <p className="text-base font-bold text-slate-800 tabular-nums mt-0.5">
                  {loading ? "—" : counts[s]}
                </p>
              </div>
            ))}
          </div>

          {/* Toolbar: busca + filtro de vendedora */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome ou telefone..."
                className="pl-9 h-9 bg-white border-slate-200"
              />
            </div>
            <Select value={salesFilter} onValueChange={setSalesFilter}>
              <SelectTrigger className="h-9 w-full sm:w-56 bg-white border-slate-200">
                <SelectValue placeholder="Vendedora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SALES}>Todas as Vendedoras</SelectItem>
                {SALESPEOPLE.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <Tabs value={String(cadence)} onValueChange={(v) => setCadence(v === "all" ? "all" : (Number(v) as CadenceFilter))}>
              <TabsList className="bg-slate-50 h-auto flex-wrap gap-1 p-1">
                <FuTabTrigger value="all" label="Geral" count={fuTotalPending} isAll />
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <FuTabTrigger
                    key={n}
                    value={String(n)}
                    label={`FU 0${n}`}
                    count={fuCounts[n]}
                  />
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 min-h-0 -mx-4 sm:-mx-6">
            <KanbanBoard
              onSelectLead={setSelected}
              selectedLeadId={selected?.id ?? null}
              search={search}
              salesFilter={salesFilter === ALL_SALES ? null : salesFilter}
              cadenceFilter={cadence}
            />
          </div>
        </div>
      </div>

      {/* Direita: Chat panel — desktop, só renderiza quando há lead selecionado */}
      {!isMobile && selected && (
        <aside
          className="hidden lg:flex shrink-0 border-l border-slate-100 bg-white flex-col min-h-0 overflow-hidden shadow-[-4px_0_24px_rgba(0,0,0,0.02)] w-[380px] xl:w-[420px] animate-slide-in-right"
        >
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatPanel lead={selected} onClose={() => setSelected(null)} />
          </div>
        </aside>
      )}

      {/* Mobile: drawer */}
      {isMobile && (
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent
            side="right"
            className="p-0 w-screen max-w-full sm:max-w-full border-0"
          >
            {selected && <ChatPanel lead={selected} onBack={() => setSelected(null)} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
