import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RevenueHeroCard, KPICards } from "@/components/DashboardSummary";
import { useLeads } from "@/hooks/useLeads";
import { PeriodFilter, PeriodKey, getPeriodRange } from "@/components/PeriodFilter";
import { LeadsVolumeChart } from "@/components/LeadsVolumeChart";
import { TemporalCards } from "@/components/TemporalCards";
import { SalesRanking } from "@/components/SalesRanking";
import { SalesThermometer } from "@/components/SalesThermometer";
import { LeadsVsSalesTimeline, LossReasonsDonut } from "@/components/ExecutiveCharts";
import { exportMonthlyReport } from "@/lib/exportReport";
import { isWithinInterval, parseISO } from "date-fns";
import { FileDown } from "lucide-react";

export default function Dashboard() {
  const { leads, loading } = useLeads();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState<{ from?: Date; to?: Date }>();
  const range = useMemo(() => getPeriodRange(period, custom), [period, custom]);

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) => l.created_at && isWithinInterval(parseISO(l.created_at), { start: range.from, end: range.to })
      ),
    [leads, range]
  );

  const total = filtered.length;

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground capitalize">
            {range.label} • {total} leads no período
          </p>
        </div>
        <Button
          onClick={() => exportMonthlyReport(leads)}
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 border-border hover:bg-muted"
          title="Exportar relatório mensal"
          aria-label="Exportar relatório mensal"
        >
          <FileDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      <PeriodFilter
        value={period}
        customRange={custom}
        onChange={(k, c) => {
          setPeriod(k);
          if (c) setCustom(c);
        }}
      />

      {/* Linha 1 — ROI compacto */}
      <RevenueHeroCard leads={filtered} loading={loading} />

      {/* Linha 2 — KPIs Rápidos */}
      <KPICards leads={filtered} loading={loading} />

      {/* Linha 3 — Funil Polido */}
      <SalesThermometer leads={filtered} />

      {/* Linha 4 — Inteligência (60/40) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <LeadsVsSalesTimeline leads={filtered} />
        </div>
        <div className="lg:col-span-2">
          <LossReasonsDonut leads={filtered} />
        </div>
      </div>

      {/* Linha 5 — Volume diário + Ranking lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <LeadsVolumeChart leads={filtered} from={range.from} to={range.to} />
        <SalesRanking leads={filtered} />
      </div>

      {/* Contexto adicional */}
      <TemporalCards leads={leads} />
    </div>
  );
}
