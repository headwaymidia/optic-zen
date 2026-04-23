import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUSES } from "@/lib/supabase";
import { DashboardSummary } from "@/components/DashboardSummary";
import { useLeads } from "@/hooks/useLeads";

export default function Dashboard() {
  const { total, countByStatus, loading } = useLeads();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos seus leads em tempo real.</p>
      </div>

      <DashboardSummary />

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
