import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { useStores } from "@/hooks/useStores";
import { useStoreMembers } from "@/hooks/useStoreMembers";
import { PeriodFilter, PeriodKey, getPeriodRange } from "@/components/PeriodFilter";
import { SalesRanking } from "@/components/SalesRanking";
import { PeriodKPIRow } from "@/components/PeriodKPIRow";
import { RoiMegaCard } from "@/components/RoiMegaCard";
import { ResponseSpeedCard } from "@/components/ResponseSpeedCard";
import { ObjectionRadar } from "@/components/ObjectionRadar";
import { VerticalNeonFunnel } from "@/components/VerticalNeonFunnel";
import { RevenueEvolutionChart } from "@/components/RevenueEvolutionChart";
import { UpcomingReturnsCard } from "@/components/UpcomingReturnsCard";
import { exportMonthlyReport } from "@/lib/exportReport";
import { isWithinInterval, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown, Tv } from "lucide-react";
import { DataSkeleton } from "@/components/ui/DataSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LS_KEY = "dashboard:filters:v1";
type PersistedFilters = { period: PeriodKey; custom?: { from?: string; to?: string }; sellerId: string };

function loadFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as PersistedFilters;
  } catch {}
  return { period: "month", sellerId: "all" };
}

export default function Dashboard() {
  usePageTitle("Dashboard");
  const { leads, loading, loadAll } = useLeads();
  useEffect(() => { loadAll(); }, [loadAll]);
  const { currentStore, filterByCurrentStore } = useStores();
  const { members } = useStoreMembers();

  const initial = useMemo(loadFilters, []);
  const [period, setPeriod] = useState<PeriodKey>(initial.period);
  const [custom, setCustom] = useState<{ from?: Date; to?: Date } | undefined>(
    initial.custom?.from && initial.custom?.to
      ? { from: new Date(initial.custom.from), to: new Date(initial.custom.to) }
      : undefined
  );
  const [sellerId, setSellerId] = useState<string>(initial.sellerId);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          period,
          sellerId,
          custom: custom ? { from: custom.from?.toISOString(), to: custom.to?.toISOString() } : undefined,
        })
      );
    } catch {}
  }, [period, custom, sellerId]);

  const range = useMemo(() => getPeriodRange(period, custom), [period, custom]);

  // Isolamento por loja: cada filial vê apenas a fatia mockada de leads que lhe pertence.
  const storeLeads = useMemo(
    () => filterByCurrentStore(leads),
    [leads, filterByCurrentStore]
  );

  const sellerScoped = useMemo(
    () => (sellerId === "all" ? storeLeads : storeLeads.filter((l) => l.responsible_id === sellerId)),
    [storeLeads, sellerId]
  );

  const filtered = useMemo(
    () =>
      sellerScoped.filter(
        (l) =>
          l.created_at &&
          isWithinInterval(new Date(l.created_at), { start: range.from, end: range.to })
      ),
    [sellerScoped, range]
  );

  const total = filtered.length;
  const periodSummary = `${format(range.from, "dd/MM", { locale: ptBR })} → ${format(range.to, "dd/MM", { locale: ptBR })}`;

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6"
      style={{
        fontFamily:
          "'Inter','Geist Sans',-apple-system,BlinkMacSystemFont,sans-serif",
      }}
    >
      {/* Cabeçalho */}
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1D1D1F] dark:text-white">
            Dashboard
          </h1>
          <p className="text-[11px] sm:text-xs text-zinc-500 capitalize">
            {range.label} · {total} leads no período
          </p>
        </div>
        <Button
          onClick={() => exportMonthlyReport(leads)}
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          title="Exportar relatório mensal"
          aria-label="Exportar relatório mensal"
        >
          <FileDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 1. Filtro Temporal — minimalista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter
            value={period}
            customRange={custom}
            onChange={(k, c) => {
              setPeriod(k);
              if (c) setCustom(c);
            }}
          />
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger className="h-8 w-[180px] rounded-full text-xs">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
          {periodSummary}
        </p>
      </div>

      {loading && leads.length === 0 ? (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <DataSkeleton variant="card" className="lg:col-span-2 [&>div]:h-32" />
            <div className="lg:col-span-3 grid grid-cols-2 gap-3">
              <DataSkeleton variant="card" count={4} className="contents [&>div]:h-32" />
            </div>
          </div>
          <DataSkeleton variant="card" className="[&>div]:h-40" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DataSkeleton variant="card" className="[&>div]:h-64" />
            <DataSkeleton variant="card" className="[&>div]:h-64" />
          </div>
        </div>
      ) : (
        <>
          {/* 2. Linha de Topo — mobile: Faturamento full-width + KPIs em 2 colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 pt-2 items-stretch">
            <div className="lg:col-span-2">
              <RoiMegaCard leads={filtered} />
            </div>
            <PeriodKPIRow leads={sellerScoped} range={range} inline />
          </div>

          {/* Retornos previstos para os próximos 30 dias */}
          <UpcomingReturnsCard leads={sellerScoped} />

          {/* 4. Velocidade & Ranking — mobile: empilha 100% / desktop: 50-50 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pt-2 items-stretch">
            <ResponseSpeedCard leads={filtered} />
            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/ranking", "_blank")}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Tv className="h-3.5 w-3.5" />
                  Entrar em modo TV
                </Button>
              </div>
              <SalesRanking leads={filtered} />
            </div>
          </div>

          {/* 5. Funil Vertical */}
          <VerticalNeonFunnel leads={filtered} />

          {/* 6. Evolução (gráfico 3-em-1) */}
          <RevenueEvolutionChart leads={sellerScoped} />
        </>
      )}
    </div>
  );
}
