import { memo, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  eachDayOfInterval,
  format,
  isSameDay,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type SeriesKey = "vendas" | "leads" | "agendamentos";

interface SeriesConfig {
  key: SeriesKey;
  label: string;
  short: string;
  color: string;        // dark neon
  colorLight: string;   // light solid
  isCurrency: boolean;
  yAxis: "left" | "right";
  strokeWidth: number;
  dashed?: boolean;
}

const SERIES: Record<SeriesKey, SeriesConfig> = {
  vendas: {
    key: "vendas",
    label: "Vendas (Faturamento)",
    short: "Vendas",
    color: "#22C55E",
    colorLight: "#059669",
    isCurrency: true,
    yAxis: "left",
    strokeWidth: 3.25,
  },
  leads: {
    key: "leads",
    label: "Leads",
    short: "Leads",
    color: "#FACC15",
    colorLight: "#CA8A04",
    isCurrency: false,
    yAxis: "right",
    strokeWidth: 2,
  },
  agendamentos: {
    key: "agendamentos",
    label: "Agendamentos",
    short: "Agendamentos",
    color: "#06B6D4",
    colorLight: "#0E7490",
    isCurrency: false,
    yAxis: "right",
    strokeWidth: 2,
    dashed: true,
  },
};

const SCHEDULED_STATUSES = new Set([
  "Agendou Exame",
  "Compareceu e Comprou",
  "Compareceu e Não Comprou",
  "Não Compareceu",
]);

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatValue(v: number, isCurrency: boolean) {
  if (isCurrency) return formatBRL(v);
  return v.toLocaleString("pt-BR");
}

interface Props {
  leads: Lead[];
}

/**
 * Multi-eixo BI: Vendas (R$) + Leads + Agendamentos simultâneos.
 * Legenda interativa com checkbox + botão "Ver Escala Total".
 */
function RevenueEvolutionChartImpl({ leads }: Props) {
  const [active, setActive] = useState<Record<SeriesKey, boolean>>({
    vendas: true,
    leads: true,
    agendamentos: true,
  });

  const toggle = (k: SeriesKey) =>
    setActive((s) => ({ ...s, [k]: !s[k] }));
  const showAll = () =>
    setActive({ vendas: true, leads: true, agendamentos: true });

  const data = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 29), end: today });

    return days.map((d) => {
      const vendas = leads
        .filter(
          (l) =>
            l.status === "Compareceu e Comprou" &&
            // usa sale_date (momento real da venda); fallback updated_at p/ vendas antigas sem sale_date
            isSameDay(new Date(l.sale_date ?? l.updated_at ?? l.created_at!), d)
        )
        .reduce((s, l) => s + (Number(l.sale_value) || 0), 0);

      const leadsCount = leads.filter(
        (l) => l.created_at && isSameDay(new Date(l.created_at), d)
      ).length;

      const agendamentos = leads.filter(
        (l) =>
          l.status &&
          SCHEDULED_STATUSES.has(l.status) &&
          isSameDay(new Date(l.updated_at ?? l.created_at!), d)
      ).length;

      return {
        date: format(d, "dd MMM", { locale: ptBR }),
        fullDate: format(d, "dd 'de' MMMM, yyyy", { locale: ptBR }),
        vendas,
        leads: leadsCount,
        agendamentos,
      };
    });
  }, [leads]);

  const totals = useMemo(
    () => ({
      vendas: data.reduce((s, d) => s + d.vendas, 0),
      leads: data.reduce((s, d) => s + d.leads, 0),
      agendamentos: data.reduce((s, d) => s + d.agendamentos, 0),
    }),
    [data]
  );

  const allActive =
    active.vendas && active.leads && active.agendamentos;

  return (
    <Card className="glass-card rounded-xl border border-border p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <p className="text-base sm:text-lg font-semibold tracking-tight text-foreground mb-1">
            Escalabilidade — Leads × Agendamentos × Vendas
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
            Últimos 30 dias · Eixo duplo (R$ / unidades)
          </p>
        </div>

        <div className="flex items-center gap-5">
          {(Object.keys(SERIES) as SeriesKey[])
            .filter((k) => active[k])
            .map((k) => {
              const s = SERIES[k];
              return (
                <div key={k} className="text-right">
                  <p
                    className="font-mono-luxe text-xl font-bold tabular-nums tracking-tighter leading-none"
                    style={{ color: s.colorLight }}
                  >
                    <span className="dark:hidden">
                      {formatValue(totals[k], s.isCurrency)}
                    </span>
                    <span
                      className="hidden dark:inline"
                      style={{
                        color: s.color,
                        textShadow: `0 0 12px ${s.color}66`,
                      }}
                    >
                      {formatValue(totals[k], s.isCurrency)}
                    </span>
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-semibold mt-1.5">
                    {s.short}
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Legenda interativa (checkbox style) + Ver Escala Total */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div
          className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border"
          role="group"
          aria-label="Séries do gráfico"
        >
          {(Object.keys(SERIES) as SeriesKey[]).map((k) => {
            const s = SERIES[k];
            const isOn = active[k];
            return (
              <button
                key={k}
                type="button"
                role="checkbox"
                aria-checked={isOn}
                onClick={() => toggle(k)}
                className={cn(
                  "group flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-all uppercase tracking-wider",
                  isOn
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground/70 hover:text-foreground"
                )}
                style={
                  isOn
                    ? {
                        boxShadow: `inset 0 0 0 1px ${s.color}40, 0 0 12px -4px ${s.color}80`,
                      }
                    : undefined
                }
              >
                {/* checkbox visual */}
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded border flex items-center justify-center transition-all",
                    isOn ? "border-transparent" : "border-muted-foreground/40"
                  )}
                  style={
                    isOn
                      ? {
                          backgroundColor: s.color,
                          boxShadow: `0 0 8px ${s.color}80`,
                        }
                      : undefined
                  }
                >
                  {isOn && (
                    <svg
                      viewBox="0 0 12 12"
                      className="h-2.5 w-2.5 text-black"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="2.5,6.5 5,9 9.5,3.5" />
                    </svg>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  {s.label}
                  {s.dashed && (
                    <span className="text-[8px] opacity-60 normal-case tracking-normal">
                      (tracejada)
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={showAll}
          disabled={allActive}
          className={cn(
            "group flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-md border transition-all",
            allActive
              ? "border-border text-muted-foreground/50 cursor-not-allowed"
              : "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15"
          )}
          style={
            !allActive
              ? { boxShadow: "0 0 16px -6px rgba(34,197,94,0.6)" }
              : undefined
          }
        >
          <Sparkles className="h-3.5 w-3.5" />
          Ver Escala Total
        </button>
      </div>

      {/* Chart */}
      <div className="h-[240px] w-full -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 16, left: 12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="vendasGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES.vendas.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={SERIES.vendas.color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tick={{
                fontSize: 9,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />

            {/* Eixo Y esquerdo — R$ (Vendas) */}
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{
                fontSize: 9,
                fill: SERIES.vendas.colorLight,
                fontWeight: 700,
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
              }
              width={42}
              label={{
                value: "R$",
                position: "insideTopLeft",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 9,
                fontWeight: 700,
                offset: -2,
              }}
            />

            {/* Eixo Y direito — Unidades (Leads / Agendamentos) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{
                fontSize: 9,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 700,
              }}
              axisLine={false}
              tickLine={false}
              width={32}
              allowDecimals={false}
              label={{
                value: "UN",
                position: "insideTopRight",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 9,
                fontWeight: 700,
                offset: -2,
              }}
            />

            <Tooltip
              cursor={{
                stroke: "hsl(var(--foreground))",
                strokeOpacity: 0.25,
                strokeDasharray: "3 3",
              }}
              content={({ active: act, payload }) => {
                if (!act || !payload || !payload.length) return null;
                const p = payload[0].payload as {
                  fullDate: string;
                  vendas: number;
                  leads: number;
                  agendamentos: number;
                };

                return (
                  <div className="rounded-lg border border-border bg-popover/95 backdrop-blur-xl px-3.5 py-3 shadow-2xl text-popover-foreground min-w-[240px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2.5">
                      {p.fullDate}
                    </p>

                    {/* Storyline: Leads → Agendamentos → Vendas */}
                    <div className="space-y-1.5">
                      <Row
                        color={SERIES.leads.color}
                        label="Leads gerados"
                        value={p.leads.toLocaleString("pt-BR")}
                        suffix="leads"
                      />
                      <Arrow />
                      <Row
                        color={SERIES.agendamentos.color}
                        label="Agendamentos"
                        value={p.agendamentos.toLocaleString("pt-BR")}
                        suffix="ag."
                        dashed
                      />
                      <Arrow />
                      <Row
                        color={SERIES.vendas.color}
                        label="Vendas"
                        value={formatBRL(p.vendas)}
                        bold
                      />
                    </div>
                  </div>
                );
              }}
            />

            {/* VENDAS — área + linha grossa */}
            {active.vendas && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="vendas"
                stroke={SERIES.vendas.color}
                strokeWidth={SERIES.vendas.strokeWidth}
                fill="url(#vendasGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: SERIES.vendas.color,
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
                style={{
                  filter: `drop-shadow(0 0 6px ${SERIES.vendas.color}80)`,
                }}
                isAnimationActive
              />
            )}

            {/* LEADS — linha sólida amarela */}
            {active.leads && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="leads"
                stroke={SERIES.leads.color}
                strokeWidth={SERIES.leads.strokeWidth}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIES.leads.color,
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
                style={{
                  filter: `drop-shadow(0 0 5px ${SERIES.leads.color}80)`,
                }}
                isAnimationActive
              />
            )}

            {/* AGENDAMENTOS — linha tracejada ciano */}
            {active.agendamentos && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="agendamentos"
                stroke={SERIES.agendamentos.color}
                strokeWidth={SERIES.agendamentos.strokeWidth}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIES.agendamentos.color,
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
                style={{
                  filter: `drop-shadow(0 0 5px ${SERIES.agendamentos.color}80)`,
                }}
                isAnimationActive
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ---------- Tooltip subcomponents ---------- */

function Row({
  color,
  label,
  value,
  suffix,
  bold,
  dashed,
}: {
  color: string;
  label: string;
  value: string;
  suffix?: string;
  bold?: boolean;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-[11px] font-medium text-foreground/80">
        {dashed ? (
          <span
            className="h-0.5 w-3 rounded-full"
            style={{
              background: `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)`,
            }}
          />
        ) : (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
          />
        )}
        {label}
      </span>
      <span
        className={cn(
          "font-mono-luxe tabular-nums",
          bold ? "text-sm font-bold" : "text-[12px] font-semibold"
        )}
        style={{ color }}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-[9px] uppercase opacity-60">{suffix}</span>
        )}
      </span>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center">
      <span className="text-muted-foreground/50 text-[10px] leading-none">
        ↓
      </span>
    </div>
  );
}

export const RevenueEvolutionChart = memo(RevenueEvolutionChartImpl);
