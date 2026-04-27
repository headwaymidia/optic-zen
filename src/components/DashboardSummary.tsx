import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, ShoppingBag, DollarSign } from "lucide-react";
import { Lead } from "@/lib/supabase";

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Card hero de Faturamento — Luxury Enterprise (glass, gradiente metalizado, ping live). */
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
    <Card className="glass-card rounded-lg h-full border-0 relative overflow-hidden">
      {/* Iluminação radial esmeralda no centro */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.04) 35%, transparent 70%)",
        }}
        aria-hidden
      />
      <CardContent className="p-12 h-full flex flex-col justify-between gap-12 relative">
        {/* Eyebrow — assinatura discreta */}
        <div className="flex items-center justify-between">
          <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-medium">
            Faturamento Gerado
          </p>
          <span className="text-[9px] text-zinc-500 tabular-nums font-medium tracking-[0.3em] uppercase">
            {buyers.length} {buyers.length === 1 ? "Venda" : "Vendas"}
          </span>
        </div>

        {/* Valor centralizado + ping live */}
        <div className="flex flex-col items-center justify-center gap-4 py-2">
          <div className="flex items-center gap-3">
            <p
              className="text-7xl font-bold tabular-nums tracking-tighter leading-none bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
            >
              {loading ? "—" : formatBRL(totalFaturamento)}
            </p>
            <span className="relative flex h-2 w-2 mt-2" aria-label="Live">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-medium">
            Tempo Real
          </p>
        </div>

        {/* Breakdown ultra-discreto */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 font-medium tracking-[0.15em] uppercase text-[10px]">Tráfego Pago</span>
            <span className="tabular-nums text-foreground font-medium">
              {loading ? "—" : formatBRL(faturamentoAds)}
              {!loading && totalFaturamento > 0 && (
                <span className="ml-2 text-zinc-500 font-light">{adsPct.toFixed(0)}%</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 font-medium tracking-[0.15em] uppercase text-[10px]">Orgânico</span>
            <span className="tabular-nums text-foreground font-medium">
              {loading ? "—" : formatBRL(faturamentoOrganico)}
              {!loading && totalFaturamento > 0 && (
                <span className="ml-2 text-zinc-500 font-light">{orgPct.toFixed(0)}%</span>
              )}
            </span>
          </div>
          {!loading && totalFaturamento > 0 && (
            <div className="h-px w-full overflow-hidden bg-white/5 flex">
              <div className="h-full bg-foreground/80 transition-all" style={{ width: `${adsPct}%` }} />
              <div className="h-full bg-zinc-700 transition-all" style={{ width: `${orgPct}%` }} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** KPIs Luxury — labels extralight tracking máximo, números medium. */
export function KPICards({ leads, loading }: { leads: Lead[]; loading: boolean }) {
  const total = leads.length;
  const agendou = leads.filter((l) => l.status === "Agendou Exame").length;
  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const vendas = buyers.length;
  const totalFat = buyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
  const ticket = vendas > 0 ? totalFat / vendas : 0;

  const items = [
    { key: "total",   label: "Total de Leads",    value: total,             icon: Users },
    { key: "agendou", label: "Agendou Exame",     value: agendou,           icon: Calendar },
    { key: "vendas",  label: "Vendas Concluídas", value: vendas,            icon: ShoppingBag },
    { key: "ticket",  label: "Ticket Médio",      value: formatBRL(ticket), icon: DollarSign },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((s) => (
        <Card key={s.key} className="glass-card rounded-lg border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-zinc-500 truncate">
                {s.label}
              </p>
              <s.icon className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.25} />
            </div>
            <div className="text-2xl font-medium tabular-nums text-foreground leading-none tracking-tight">
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
