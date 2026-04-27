import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, ShoppingBag, DollarSign, Megaphone, Store, TrendingUp } from "lucide-react";
import { Lead } from "@/lib/supabase";

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Card hero de Faturamento (ROI) — compacto, horizontal, branco. */
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
    <Card className="border border-slate-800 bg-slate-900 text-slate-100 rounded-xl shadow-[0_4px_20px_-8px_rgba(15,23,42,0.4)] overflow-hidden h-full">
      <CardContent className="p-5 h-full flex flex-col justify-between gap-4">
        {/* Top: label + valor */}
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400 font-bold">
              Faturamento Gerado · ROI
            </p>
            <span className="ml-auto inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_hsl(160_84%_55%)]" />
          </div>

          <p
            className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight leading-none mt-3 text-emerald-400"
            style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", textShadow: "0 0 24px hsl(160 84% 50% / 0.45)" }}
          >
            {loading ? "—" : formatBRL(totalFaturamento)}
          </p>
        </div>

        {/* Bottom: breakdown ads/orgânico */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <Megaphone className="h-3 w-3" />
                Tráfego Pago
              </p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5 tabular-nums">
                {loading ? "—" : formatBRL(faturamentoAds)}
                {!loading && totalFaturamento > 0 && (
                  <span className="ml-1 text-[10px] text-slate-500 font-normal">
                    {adsPct.toFixed(0)}%
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <Store className="h-3 w-3" />
                Orgânico
              </p>
              <p className="text-sm font-bold text-slate-100 mt-0.5 tabular-nums">
                {loading ? "—" : formatBRL(faturamentoOrganico)}
                {!loading && totalFaturamento > 0 && (
                  <span className="ml-1 text-[10px] text-slate-500 font-normal">
                    {orgPct.toFixed(0)}%
                  </span>
                )}
              </p>
            </div>
          </div>
          {!loading && totalFaturamento > 0 && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800 flex">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${adsPct}%` }} />
              <div className="h-full bg-emerald-700 transition-all" style={{ width: `${orgPct}%` }} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** KPI vertical empilhado: Vendas e Ticket Médio para combinar com o Hero ROI. */
export function KpiStack({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const vendas = buyers.length;
  const totalFat = buyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
  const ticket = vendas > 0 ? totalFat / vendas : 0;

  const items = [
    { key: "vendas", label: "Vendas Concluídas", value: loading ? "—" : vendas, icon: ShoppingBag, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { key: "ticket", label: "Ticket Médio",       value: loading ? "—" : formatBRL(ticket), icon: DollarSign, color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-500/10" },
  ] as const;

  return (
    <div className="grid grid-rows-2 gap-3 h-full">
      {items.map((s) => (
        <Card
          key={s.key}
          className="border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card flex"
        >
          <CardContent className="p-4 flex flex-col justify-between w-full">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
                {s.label}
              </p>
              <div className={`flex h-7 w-7 items-center justify-center rounded-md ${s.bg}`}>
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground leading-none mt-2 tracking-tight">
              {s.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** KPIs compactos: 4 cards minimalistas. */
export function KPICards({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const total = leads.length;
  const agendou = leads.filter((l) => l.status === "Agendou Exame").length;
  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const vendas = buyers.length;
  const totalFat = buyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
  const ticket = vendas > 0 ? totalFat / vendas : 0;

  const items = [
    { key: "total", label: "Total de Leads", value: total, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { key: "agendou", label: "Agendou Exame", value: agendou, icon: Calendar, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
    { key: "vendas", label: "Vendas Concluídas", value: vendas, icon: ShoppingBag, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { key: "ticket", label: "Ticket Médio", value: formatBRL(ticket), icon: DollarSign, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {items.map((s) => (
        <Card
          key={s.key}
          className="border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:hover:shadow-[0_0_20px_-8px_hsl(217_91%_60%/0.3)] transition-shadow bg-card"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {s.label}
              </p>
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${s.bg}`}>
                <s.icon className={`h-3 w-3 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl font-black tabular-nums text-foreground leading-none mt-2 tracking-tight">
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
    <div className="space-y-3">
      <RevenueHeroCard leads={leads} loading={loading} />
      <KPICards leads={leads} loading={loading} />
    </div>
  );
}
