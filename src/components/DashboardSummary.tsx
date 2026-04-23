import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ShoppingBag, UserX, RefreshCw } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";

const SUMMARY = [
  { key: "total", label: "Total de Leads", icon: Users, color: "text-primary" },
  { key: "Agendou Exame", label: "Agendou Exame", icon: Calendar, color: "text-purple-600" },
  { key: "Compareceu e Comprou", label: "Compareceu e Comprou", icon: ShoppingBag, color: "text-emerald-600" },
  { key: "Não Compareceu", label: "Não Compareceu", icon: UserX, color: "text-orange-600" },
  { key: "Repescagem", label: "Repescagem", icon: RefreshCw, color: "text-indigo-600" },
] as const;

export function DashboardSummary() {
  const { total, countByStatus, loading } = useLeads();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {SUMMARY.map((s) => {
        const value = s.key === "total" ? total : countByStatus(s.key as any);
        return (
          <Card key={s.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
