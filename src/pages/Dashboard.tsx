import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LEAD_STATUSES } from "@/lib/supabase";
import { DashboardSummary } from "@/components/DashboardSummary";
import { useLeads } from "@/hooks/useLeads";
import { PeriodFilter, PeriodKey, getPeriodRange } from "@/components/PeriodFilter";
import { LeadsVolumeChart } from "@/components/LeadsVolumeChart";
import { TemporalCards } from "@/components/TemporalCards";
import { SalesRanking } from "@/components/SalesRanking";
import { SalesThermometer } from "@/components/SalesThermometer";
import { exportMonthlyReport } from "@/lib/exportReport";
import { isWithinInterval, parseISO } from "date-fns";
import { FileDown } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "Novo Lead": "#3B82F6",
  "Em Atendimento": "#22D3EE",
  "Aguardando Resposta": "#F59E0B",
  "Agendou Exame": "#8B5CF6",
  "Não Compareceu": "#F97316",
  "Compareceu e Comprou": "#10B981",
  "Compareceu e Não Comprou": "#EF4444",
  Repescagem: "#EC4899",
};

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
  const countByStatus = (s: string) => filtered.filter((l) => l.status === s).length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground capitalize">
            {range.label} • {total} leads no período
          </p>
        </div>
        <Button onClick={() => exportMonthlyReport(leads)} variant="outline" size="sm" className="w-full sm:w-auto">
          <FileDown className="h-4 w-4 mr-2" />
          <span className="truncate">Exportar Relatório Mensal</span>
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

      <DashboardSummary leads={filtered} loading={loading} />

      <SalesThermometer leads={filtered} />

      <TemporalCards leads={leads} />

      <LeadsVolumeChart leads={filtered} from={range.from} to={range.to} />

      <SalesRanking leads={filtered} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por etapa</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const data = LEAD_STATUSES
              .map((s) => ({ name: s, value: countByStatus(s), color: STATUS_COLORS[s] ?? "#94A3B8" }))
              .filter((d) => d.value > 0);

            if (loading) {
              return <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>;
            }
            if (data.length === 0) {
              return <p className="text-sm text-muted-foreground py-8 text-center">Sem leads no período.</p>;
            }

            return (
              <div className="grid md:grid-cols-2 gap-6 items-center">
                {/* Donut */}
                <div className="relative h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RTooltip
                        formatter={(v: number, n: string) => [`${v} leads`, n]}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                      />
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {data.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-3xl font-bold text-slate-900">{total}</span>
                    <span className="text-sm text-slate-500">Total</span>
                  </div>
                </div>

                {/* Legenda */}
                <ul className="space-y-2">
                  {data.map((d) => (
                    <li
                      key={d.name}
                      className="flex justify-between items-center text-sm py-1.5 px-2 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="truncate text-slate-700">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
