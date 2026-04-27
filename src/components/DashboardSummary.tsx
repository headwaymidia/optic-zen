import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ShoppingBag, DollarSign, Megaphone, Store } from "lucide-react";
import { Lead } from "@/lib/supabase";

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Card hero de Faturamento (ROI) — ocupa 100% da largura.
 */
export function RevenueHeroCard({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const totalFaturamento = buyers.reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);
  const faturamentoAds = buyers
    .filter((l) => l.lead_source && ADS_SOURCES.has(String(l.lead_source)))
    .reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);
  const faturamentoOrganico = totalFaturamento - faturamentoAds;

  const adsPct = totalFaturamento > 0 ? (faturamentoAds / totalFaturamento) * 100 : 0;
  const orgPct = 100 - adsPct;

  return (
    <Card className="border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-2xl shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-emerald-900">
          Faturamento Gerado (ROI)
        </CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
          <DollarSign className="h-5 w-5 text-emerald-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-emerald-700 tabular-nums">
          {loading ? "—" : formatBRL(totalFaturamento)}
        </div>
        <p className="text-xs text-emerald-700/70 mt-1">
          Soma dos leads em "Compareceu e Comprou" no período
        </p>

        {!loading && totalFaturamento > 0 && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/60 flex">
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{ width: `${adsPct}%` }}
              title={`Tráfego Pago: ${adsPct.toFixed(0)}%`}
            />
            <div
              className="h-full bg-emerald-300 transition-all"
              style={{ width: `${orgPct}%` }}
              title={`Orgânico: ${orgPct.toFixed(0)}%`}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-emerald-200/60">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-800/70">
              <Megaphone className="h-3 w-3" />
              Tráfego Pago (Anúncios)
            </p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5 tabular-nums">
              {loading ? "—" : formatBRL(faturamentoAds)}
            </p>
            {!loading && totalFaturamento > 0 && (
              <p className="text-[10px] text-emerald-700/60">{adsPct.toFixed(0)}% do total</p>
            )}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-800/70">
              <Store className="h-3 w-3" />
              Balcão / Orgânico
            </p>
            <p className="text-lg font-bold text-slate-700 mt-0.5 tabular-nums">
              {loading ? "—" : formatBRL(faturamentoOrganico)}
            </p>
            {!loading && totalFaturamento > 0 && (
              <p className="text-[10px] text-emerald-700/60">{orgPct.toFixed(0)}% do total</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * KPIs rápidos: 4 cards lado a lado.
 */
export function KPICards({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const total = leads.length;
  const agendou = leads.filter((l) => l.status === "Agendou Exame").length;
  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const vendas = buyers.length;
  const totalFat = buyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
  const ticket = vendas > 0 ? totalFat / vendas : 0;

  const items = [
    { key: "total", label: "Total de Leads", value: total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { key: "agendou", label: "Agendou Exame", value: agendou, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
    { key: "vendas", label: "Compareceu e Comprou", value: vendas, icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "ticket", label: "Ticket Médio", value: formatBRL(ticket), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s) => (
        <Card key={s.key} className="border border-slate-200 rounded-xl shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${s.bg}`}>
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-slate-900">
              {loading ? "—" : s.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Wrapper de compatibilidade — mantém a API antiga renderizando a nova estrutura.
 */
export function DashboardSummary({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <RevenueHeroCard leads={leads} loading={loading} />
      <KPICards leads={leads} loading={loading} />
    </div>
  );
}
