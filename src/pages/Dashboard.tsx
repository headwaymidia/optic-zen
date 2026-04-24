import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LEAD_STATUSES } from "@/lib/supabase";
import { DashboardSummary } from "@/components/DashboardSummary";
import { useLeads } from "@/hooks/useLeads";
import { PeriodFilter, PeriodKey, getPeriodRange } from "@/components/PeriodFilter";
import { LeadsVolumeChart } from "@/components/LeadsVolumeChart";
import { TemporalCards } from "@/components/TemporalCards";
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

      <TemporalCards leads={leads} />

      <LeadsVolumeChart leads={filtered} from={range.from} to={range.to} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por etapa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {LEAD_STATUSES.map((s) => {
            const count = countByStatus(s);
            const denom = total || 1;
            const pct = (count / denom) * 100;
            return (
              <div key={s} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s}</span>
                  <span className="text-muted-foreground">{loading ? "—" : count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
