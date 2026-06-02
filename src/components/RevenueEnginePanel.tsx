import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { eachDayOfInterval, format, isSameDay, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);
const EMERALD = "#10B981";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Mega-card "Motor de Faturamento" — unifica ROI + Performance.
 * O gráfico é o FUNDO da metade inferior, criando uma onda contínua sob o número.
 */
export function RevenueEnginePanel({
  leads,
  loading,
}: {
  leads: Lead[];
  loading: boolean;
}) {
  const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
  const totalFaturamento = buyers.reduce(
    (sum, l) => sum + (Number(l.sale_value) || 0),
    0
  );
  const faturamentoAds = buyers
    .filter((l) => l.lead_source && ADS_SOURCES.has(String(l.lead_source)))
    .reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);
  const faturamentoOrganico = totalFaturamento - faturamentoAds;
  const adsPct = totalFaturamento > 0 ? (faturamentoAds / totalFaturamento) * 100 : 0;
  const orgPct = 100 - adsPct;

  const chartData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 13), end: today });
    return days.map((d) => {
      const novos = leads.filter(
        (l) => l.created_at && isSameDay(new Date(l.created_at), d)
      ).length;
      const vendas = leads.filter((l) => {
        if (l.status !== "Compareceu e Comprou") return false;
        const ref = l.updated_at ?? l.created_at;
        return ref && isSameDay(parseISO(ref), d);
      }).length;
      const valor = leads
        .filter((l) => {
          if (l.status !== "Compareceu e Comprou") return false;
          const ref = l.updated_at ?? l.created_at;
          return ref && isSameDay(parseISO(ref), d);
        })
        .reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
      return { date: format(d, "dd MMM", { locale: ptBR }), novos, vendas, valor };
    });
  }, [leads]);

  return (
    <Card className="glass-card rounded-2xl border-0 relative overflow-hidden h-full min-h-[520px] flex flex-col">
      {/* Halo radial esmeralda atrás do número */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(16,185,129,0.10) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* TOPO — Eyebrow + valor monumental */}
      <div className="relative px-10 pt-10 pb-4">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500 font-bold mb-1.5">
              Motor de Faturamento
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-600 font-medium">
              Receita gerada no período
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-label="Live">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">
              {buyers.length} {buyers.length === 1 ? "Venda" : "Vendas"}
            </span>
          </div>
        </div>

        {/* Valor monumental */}
        <div className="flex items-baseline gap-4 flex-wrap">
          <p
            className="text-[clamp(3.5rem,7vw,6.5rem)] font-bold tabular-nums tracking-tighter leading-none text-foreground dark:bg-gradient-to-r dark:from-emerald-400 dark:via-white dark:to-emerald-400 dark:bg-clip-text dark:text-transparent dark:drop-shadow-[0_0_18px_rgba(16,185,129,0.25)]"
            style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
          >
            {loading ? "—" : formatBRL(totalFaturamento)}
          </p>
        </div>

        {/* Breakdown ads vs orgânico */}
        <div className="flex items-center gap-6 mt-6 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-zinc-500 uppercase tracking-[0.2em] text-[10px] font-semibold">
              Tráfego Pago
            </span>
            <span className="font-mono-luxe tabular-nums text-foreground font-bold">
              {loading ? "—" : formatBRL(faturamentoAds)}
            </span>
            {!loading && totalFaturamento > 0 && (
              <span className="font-mono-luxe text-zinc-500 font-medium">
                {adsPct.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="h-3 w-px bg-white/10 dark:bg-white/10 bg-black/10" />
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span className="text-zinc-500 uppercase tracking-[0.2em] text-[10px] font-semibold">
              Orgânico
            </span>
            <span className="font-mono-luxe tabular-nums text-foreground font-bold">
              {loading ? "—" : formatBRL(faturamentoOrganico)}
            </span>
            {!loading && totalFaturamento > 0 && (
              <span className="font-mono-luxe text-zinc-500 font-medium">
                {orgPct.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BASE — Onda contínua de receita como FUNDO */}
      <div className="relative flex-1 mt-auto -mb-px">
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500/70 font-semibold pl-6 mb-1">
            Últimos 14 dias · Receita & Volume
          </p>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueWave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EMERALD} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="leadsWave" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EMERALD} stopOpacity={0.10} />
                  <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                </linearGradient>
                <filter id="emeraldGlowEngine" x="-20%" y="-50%" width="140%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number, name: string) => {
                  if (name === "valor") return [formatBRL(v), "Receita"];
                  if (name === "novos") return [v, "Leads"];
                  return [v, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="novos"
                stroke="transparent"
                fill="url(#leadsWave)"
                isAnimationActive
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={EMERALD}
                strokeWidth={2}
                fill="url(#revenueWave)"
                filter="url(#emeraldGlowEngine)"
                isAnimationActive
                activeDot={{ r: 4, fill: EMERALD, stroke: "#fff", strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
