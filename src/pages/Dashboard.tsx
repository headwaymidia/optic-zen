import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RevenueHeroCard, KPICards } from "@/components/DashboardSummary";
import { useLeads } from "@/hooks/useLeads";
import { PeriodFilter, PeriodKey, getPeriodRange } from "@/components/PeriodFilter";
import { LeadsVolumeChart } from "@/components/LeadsVolumeChart";
import { TemporalCardsCompact } from "@/components/TemporalCards";
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
      {/* Cabeçalho */}
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground capitalize">
            {range.label} • {total} leads no período
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Mini cards de tempo (Hoje / Semana / Mês) */}
      <TemporalCardsCompact leads={leads} />

      <PeriodFilter
        value={period}
        customRange={custom}
        onChange={(k, c) => {
          setPeriod(k);
          if (c) setCustom(c);
        }}
      />

      {/* Linha 1 — ROI Protagonista */}
      <RevenueHeroCard leads={filtered} loading={loading} />

      {/* Linha 2 — KPIs */}
      <KPICards leads={filtered} loading={loading} />

      {/* Linha 3 — Funil em progress bar */}
      <SalesThermometer leads={filtered} />

      {/* Linha 4 — Charts unificados em Tabs (60%) + Motivos de Perda (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Card className="lg:col-span-3 border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card">
          <Tabs defaultValue="timeline" className="w-full">
            <CardHeader className="pb-2 pt-3 px-4 flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">
                Performance
              </CardTitle>
              <TabsList className="h-7">
                <TabsTrigger value="timeline" className="text-[11px] h-5 px-2">
                  Leads vs Vendas
                </TabsTrigger>
                <TabsTrigger value="volume" className="text-[11px] h-5 px-2">
                  Volume diário
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="px-2 pb-3 pt-0">
              <TabsContent value="timeline" className="mt-0">
                <LeadsVsSalesTimeline leads={filtered} embedded />
              </TabsContent>
              <TabsContent value="volume" className="mt-0">
                <LeadsVolumeChart leads={filtered} from={range.from} to={range.to} embedded />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="lg:col-span-2">
          <LossReasonsDonut leads={filtered} />
        </div>
      </div>

      {/* Linha 5 — Ranking 100% */}
      <SalesRanking leads={filtered} />
    </div>
  );
}
