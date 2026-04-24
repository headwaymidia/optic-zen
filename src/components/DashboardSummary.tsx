import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ShoppingBag, UserX, RefreshCw, DollarSign, Megaphone, Store } from "lucide-react";
import { Lead } from "@/lib/supabase";

const SUMMARY = [
  { key: "total", label: "Total de Leads", icon: Users, color: "text-primary" },
  { key: "Agendou Exame", label: "Agendou Exame", icon: Calendar, color: "text-purple-600" },
  { key: "Compareceu e Comprou", label: "Compareceu e Comprou", icon: ShoppingBag, color: "text-emerald-600" },
  { key: "Não Compareceu", label: "Não Compareceu", icon: UserX, color: "text-orange-600" },
  { key: "Repescagem", label: "Repescagem", icon: RefreshCw, color: "text-indigo-600" },
] as const;

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DashboardSummary({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const total = leads.length;
  const countByStatus = (s: string) => leads.filter((l) => l.status === s).length;

  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const totalFaturamento = buyers.reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);
  const faturamentoAds = buyers
    .filter((l) => l.lead_source && ADS_SOURCES.has(String(l.lead_source)))
    .reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);
  const faturamentoOrganico = totalFaturamento - faturamentoAds;

  const adsPct = totalFaturamento > 0 ? (faturamentoAds / totalFaturamento) * 100 : 0;
  const orgPct = 100 - adsPct;

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
            {loading ? "—" : formatBRL(totalFaturamento)}
          </div>
          <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-1">
            Soma dos leads em "Compareceu e Comprou" no período
          </p>

          {!loading && totalFaturamento > 0 && (
            <>
              {/* Proporção visual */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/60 dark:bg-emerald-900/40 flex">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${adsPct}%` }}
                  title={`Tráfego Pago: ${adsPct.toFixed(0)}%`}
                />
                <div
                  className="h-full bg-emerald-300 dark:bg-emerald-700 transition-all"
                  style={{ width: `${orgPct}%` }}
                  title={`Orgânico: ${orgPct.toFixed(0)}%`}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-800/40">
            <div>
              <p className="flex items-center gap-1 text-[11px] text-emerald-800/70 dark:text-emerald-200/70">
                <Megaphone className="h-3 w-3" />
                Tráfego Pago (Anúncios)
              </p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {loading ? "—" : formatBRL(faturamentoAds)}
              </p>
              {!loading && totalFaturamento > 0 && (
                <p className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60">
                  {adsPct.toFixed(0)}% do total
                </p>
              )}
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] text-emerald-800/70 dark:text-emerald-200/70">
                <Store className="h-3 w-3" />
                Balcão / Orgânico
              </p>
              <p className="text-base font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                {loading ? "—" : formatBRL(faturamentoOrganico)}
              </p>
              {!loading && totalFaturamento > 0 && (
                <p className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60">
                  {orgPct.toFixed(0)}% do total
                </p>
              )}
            </div>
          </div>
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
