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
    <Card className="border border-slate-800 bg-slate-900 text-slate-100 rounded-lg overflow-hidden h-full">
      <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center gap-3">
        {/* Eyebrow */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-emerald-400" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">
            Faturamento Gerado · ROI
          </p>
        </div>

        {/* Valor protagonista — limpo, sem glow */}
        <p
          className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight leading-none text-emerald-400"
          style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
        >
          {loading ? "—" : formatBRL(totalFaturamento)}
        </p>

        {/* Breakdown discreto */}
        <div className="w-full max-w-xs space-y-1 pt-1">
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-slate-500 font-normal">
              <Megaphone className="h-2.5 w-2.5" />
              Tráfego Pago
            </span>
            <span className="tabular-nums text-slate-300 font-medium">
              {loading ? "—" : formatBRL(faturamentoAds)}
              {!loading && totalFaturamento > 0 && (
                <span className="ml-1 text-slate-500 font-normal">{adsPct.toFixed(0)}%</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-slate-500 font-normal">
              <Store className="h-2.5 w-2.5" />
              Orgânico
            </span>
            <span className="tabular-nums text-slate-300 font-medium">
              {loading ? "—" : formatBRL(faturamentoOrganico)}
              {!loading && totalFaturamento > 0 && (
                <span className="ml-1 text-slate-500 font-normal">{orgPct.toFixed(0)}%</span>
              )}
            </span>
          </div>
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

/** KPIs compactos: 4 cards minimalistas — paleta limpa (Blue/Emerald + neutros). */
export function KPICards({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const total = leads.length;
  const agendou = leads.filter((l) => l.status === "Agendou Exame").length;
  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const vendas = buyers.length;
  const totalFat = buyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
  const ticket = vendas > 0 ? totalFat / vendas : 0;

  const items = [
    { key: "total",   label: "Total de Leads",    value: total,             icon: Users,       color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-500/10" },
    { key: "agendou", label: "Agendou Exame",     value: agendou,           icon: Calendar,    color: "text-slate-600 dark:text-slate-300",     bg: "bg-slate-100 dark:bg-slate-500/10" },
    { key: "vendas",  label: "Vendas Concluídas", value: vendas,            icon: ShoppingBag, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { key: "ticket",  label: "Ticket Médio",      value: formatBRL(ticket), icon: DollarSign,  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {items.map((s) => (
        <Card
          key={s.key}
          className="border border-border dark:border-white/5 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
                {s.label}
              </p>
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${s.bg}`}>
                <s.icon className={`h-3 w-3 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-foreground leading-none mt-2 tracking-tight">
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
