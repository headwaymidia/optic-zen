import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, ShoppingBag, DollarSign } from "lucide-react";
import { Lead } from "@/lib/supabase";

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Card hero de Faturamento — High-End Minimalist (preto puro, branco protagonista). */
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
    <Card className="border border-white/10 bg-card rounded-lg h-full">
      <CardContent className="p-8 h-full flex flex-col justify-between gap-8">
        {/* Eyebrow + indicador de pulso (live) */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            Faturamento Gerado
          </p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {buyers.length} {buyers.length === 1 ? "venda" : "vendas"}
            </span>
          </div>
        </div>

        {/* Valor protagonista — gradiente metalizado branco→cinza claro, font-black */}
        <p
          className="text-5xl sm:text-6xl font-black tabular-nums tracking-tight leading-none bg-clip-text text-transparent"
          style={{
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            backgroundImage: "linear-gradient(180deg, #ffffff 0%, #d4d4d8 100%)",
          }}
        >
          {loading ? "—" : formatBRL(totalFaturamento)}
        </p>

        {/* Breakdown ultra-discreto */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Tráfego Pago</span>
            <span className="tabular-nums text-foreground font-medium">
              {loading ? "—" : formatBRL(faturamentoAds)}
              {!loading && totalFaturamento > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">{adsPct.toFixed(0)}%</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Orgânico</span>
            <span className="tabular-nums text-foreground font-medium">
              {loading ? "—" : formatBRL(faturamentoOrganico)}
              {!loading && totalFaturamento > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">{orgPct.toFixed(0)}%</span>
              )}
            </span>
          </div>
          {!loading && totalFaturamento > 0 && (
            <div className="h-px w-full overflow-hidden bg-white/10 flex">
              <div className="h-full bg-foreground transition-all" style={{ width: `${adsPct}%` }} />
              <div className="h-full bg-muted-foreground/40 transition-all" style={{ width: `${orgPct}%` }} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** KPIs minimalistas — 4 cards, ícones de linha em cinza claro. */
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s) => (
        <Card
          key={s.key}
          className="border border-border bg-card rounded-lg"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground truncate">
                {s.label}
              </p>
              <s.icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
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
