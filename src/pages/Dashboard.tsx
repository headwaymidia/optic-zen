import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RevenueHeroCard, KPICards } from "@/components/DashboardSummary";
import { useLeads } from "@/hooks/useLeads";
import { PeriodFilter, PeriodKey, getPeriodRange } from "@/components/PeriodFilter";
import { LeadsVolumeChart } from "@/components/LeadsVolumeChart";
import { SalesRanking } from "@/components/SalesRanking";
import { SalesThermometer } from "@/components/SalesThermometer";
import { LeadsVsSalesTimeline, LossReasonsDonut } from "@/components/ExecutiveCharts";
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
    <div className="p-3 sm:p-4 space-y-3">
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

      {/* Filtros de período + resumo inline */}
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

      {/* Linha única de 4 KPIs */}
      <KPICards leads={filtered} loading={loading} />

      {/* Bloco Central: ROI (col-8, ~66%) + Motivos de Perda (col-4, ~33%) */}
      <div className="grid grid-cols-12 gap-3 items-stretch">
        <div className="col-span-12 lg:col-span-8">
          <RevenueHeroCard leads={filtered} loading={loading} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LossReasonsDonut leads={filtered} />
        </div>
      </div>

      {/* Funil 100% */}
      <SalesThermometer leads={filtered} />

      {/* Performance 100% */}
      <Card className="border border-white/10 bg-card rounded-lg">
        <Tabs defaultValue="timeline" className="w-full">
          <CardHeader className="pb-2 pt-4 px-5 flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Performance
            </CardTitle>
            <TabsList className="h-7 bg-muted/50 rounded-full p-0.5">
              <TabsTrigger value="timeline" className="text-[11px] h-6 px-3 rounded-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                Leads vs Vendas
              </TabsTrigger>
              <TabsTrigger value="volume" className="text-[11px] h-6 px-3 rounded-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
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

      {/* Ranking 100% */}
      <SalesRanking leads={filtered} />
    </div>
  );
}
