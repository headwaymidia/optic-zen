import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ShoppingBag, DollarSign, Megaphone, Store } from "lucide-react";
import { Lead } from "@/lib/supabase";

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Card hero de Faturamento (ROI) — ocupa 100% da largura. */
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
    <Card
      className="relative border-0 border-t-4 border-t-emerald-500 bg-gradient-to-br from-emerald-50/80 via-white to-white rounded-2xl shadow-[0_10px_40px_-15px_rgba(16,185,129,0.25)] overflow-hidden"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-emerald-900/90 tracking-wide uppercase">
          Faturamento Gerado · ROI
        </CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <DollarSign className="h-5 w-5 text-emerald-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="text-5xl sm:text-6xl font-black tabular-nums leading-none bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 bg-clip-text text-transparent"
        >
          {loading ? "—" : formatBRL(totalFaturamento)}
        </div>
        <p className="text-xs text-emerald-800/60 mt-2 font-medium">
          Soma dos leads em "Compareceu e Comprou" no período
        </p>

        {!loading && totalFaturamento > 0 && (
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-emerald-100 flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-emerald-100">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-800/70 font-medium">
              <Megaphone className="h-3 w-3" />
              Tráfego Pago (Anúncios)
            </p>
            <p className="text-xl font-black text-emerald-600 mt-1 tabular-nums">
              {loading ? "—" : formatBRL(faturamentoAds)}
            </p>
            {!loading && totalFaturamento > 0 && (
              <p className="text-[10px] text-emerald-700/60 font-semibold">{adsPct.toFixed(0)}% do total</p>
            )}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-800/70 font-medium">
              <Store className="h-3 w-3" />
              Balcão / Orgânico
            </p>
            <p className="text-xl font-black text-slate-700 mt-1 tabular-nums">
              {loading ? "—" : formatBRL(faturamentoOrganico)}
            </p>
            {!loading && totalFaturamento > 0 && (
              <p className="text-[10px] text-emerald-700/60 font-semibold">{orgPct.toFixed(0)}% do total</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** KPIs rápidos: 4 cards com border-t colorido. */
export function KPICards({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const total = leads.length;
  const agendou = leads.filter((l) => l.status === "Agendou Exame").length;
  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const vendas = buyers.length;
  const totalFat = buyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
  const ticket = vendas > 0 ? totalFat / vendas : 0;

  const items = [
    { key: "total", label: "Total de Leads", value: total, icon: Users, color: "text-blue-600", bg: "bg-blue-50", topBorder: "border-t-blue-500" },
    { key: "agendou", label: "Agendou Exame", value: agendou, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50", topBorder: "border-t-purple-500" },
    { key: "vendas", label: "Compareceu e Comprou", value: vendas, icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50", topBorder: "border-t-emerald-500" },
    { key: "ticket", label: "Ticket Médio", value: formatBRL(ticket), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50", topBorder: "border-t-amber-500" },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s) => (
        <Card
          key={s.key}
          className={`border-0 border-t-4 ${s.topBorder} rounded-xl shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_32px_-8px_rgba(15,23,42,0.12)] transition-shadow bg-white`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </CardTitle>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${s.bg}`}>
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums text-slate-900 leading-none">
              {loading ? "—" : s.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Wrapper de compatibilidade. */
export function DashboardSummary({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <RevenueHeroCard leads={leads} loading={loading} />
      <KPICards leads={leads} loading={loading} />
    </div>
  );
}
