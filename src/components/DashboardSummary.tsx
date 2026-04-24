import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ShoppingBag, UserX, RefreshCw, DollarSign } from "lucide-react";
import { Lead } from "@/lib/supabase";

const SUMMARY = [
  { key: "total", label: "Total de Leads", icon: Users, color: "text-primary" },
  { key: "Agendou Exame", label: "Agendou Exame", icon: Calendar, color: "text-purple-600" },
  { key: "Compareceu e Comprou", label: "Compareceu e Comprou", icon: ShoppingBag, color: "text-emerald-600" },
  { key: "Não Compareceu", label: "Não Compareceu", icon: UserX, color: "text-orange-600" },
  { key: "Repescagem", label: "Repescagem", icon: RefreshCw, color: "text-indigo-600" },
] as const;

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DashboardSummary({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const total = leads.length;
  const countByStatus = (s: string) => leads.filter((l) => l.status === s).length;

  const revenue = leads
    .filter((l) => l.status === "Compareceu e Comprou")
    .reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);

  return (
    <div className="space-y-3">
      {/* ROI Highlight Card */}
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Faturamento Gerado (ROI)
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
            {loading ? "—" : formatBRL(revenue)}
          </div>
          <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-1">
            Soma dos leads em "Compareceu e Comprou" no período
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SUMMARY.map((s) => {
          const value = s.key === "total" ? total : countByStatus(s.key);
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
    </div>
  );
}
