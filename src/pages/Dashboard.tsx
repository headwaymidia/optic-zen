import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { useStores } from "@/hooks/useStores";
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
import { FileDown } from "lucide-react";

export default function Dashboard() {
  const { leads, loading } = useLeads();
  const { currentStore, filterByCurrentStore } = useStores();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState<{ from?: Date; to?: Date }>();
  const range = useMemo(() => getPeriodRange(period, custom), [period, custom]);

  // Isolamento por loja: cada filial vê apenas a fatia mockada de leads que lhe pertence.
  const storeLeads = useMemo(
    () => filterByCurrentStore(leads),
    [leads, filterByCurrentStore]
  );

  const filtered = useMemo(
    () =>
      storeLeads.filter(
        (l) =>
          l.created_at &&
          isWithinInterval(parseISO(l.created_at), { start: range.from, end: range.to })
      ),
    [storeLeads, range]
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
        <PeriodFilter
          value={period}
          customRange={custom}
          onChange={(k, c) => {
            setPeriod(k);
            if (c) setCustom(c);
          }}
        />
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
          {periodSummary}
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500">Carregando…</p>
      ) : (
        <>
          {/* 2. Linha de Topo — mobile: Faturamento full-width + KPIs em 2 colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 pt-2 items-stretch">
            <div className="lg:col-span-2">
              <RoiMegaCard leads={filtered} />
            </div>
            <PeriodKPIRow leads={storeLeads} range={range} inline />
          </div>

          {/* 4. Velocidade & Ranking — mobile: empilha 100% / desktop: 50-50 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pt-2 items-stretch">
            <ResponseSpeedCard leads={filtered} />
            <SalesRanking leads={filtered} />
          </div>

          {/* 5. Funil Vertical */}
          <VerticalNeonFunnel leads={filtered} />

          {/* 6. Evolução (gráfico 3-em-1) */}
          <RevenueEvolutionChart leads={storeLeads} />
        </>
      )}
    </div>
  );
}
