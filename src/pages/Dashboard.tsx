import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { KPICards } from "@/components/DashboardSummary";
import { useLeads } from "@/hooks/useLeads";
import { PeriodFilter, PeriodKey, getPeriodRange } from "@/components/PeriodFilter";
import { SalesRanking } from "@/components/SalesRanking";
import { RevenueEnginePanel } from "@/components/RevenueEnginePanel";
import { VerticalJourneyFunnel } from "@/components/VerticalJourneyFunnel";
import { LossIntelligenceTags } from "@/components/LossIntelligenceTags";
import { exportMonthlyReport } from "@/lib/exportReport";
import { isWithinInterval, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const periodSummary = `Exibindo dados de ${format(range.from, "dd/MM", { locale: ptBR })} a ${format(range.to, "dd/MM", { locale: ptBR })}`;

  return (
    <div className="p-6 sm:p-10 space-y-10">
      {/* Cabeçalho */}
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

      {/* Filtros + resumo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter
          value={period}
          customRange={custom}
          onChange={(k, c) => {
            setPeriod(k);
            if (c) setCustom(c);
          }}
        />
        <p className="text-[11px] text-muted-foreground italic">{periodSummary}</p>
      </div>

      {/* KPIs sutis (linha discreta) */}
      <KPICards leads={filtered} loading={loading} />

      {/* BENTO BOX ASSIMÉTRICO — 65% Motor de Faturamento | 35% Jornada Vertical */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-8 items-stretch">
        <RevenueEnginePanel leads={filtered} loading={loading} />
        <VerticalJourneyFunnel leads={filtered} />
      </div>

      {/* Tags de Inteligência de Perda — substitui o donut */}
      <LossIntelligenceTags leads={filtered} />

      {/* Ranking */}
      <SalesRanking leads={filtered} />
    </div>
  );
}
