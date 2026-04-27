import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Lead } from "@/lib/supabase";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type MetricKey = "faturamento" | "leads" | "agendamentos" | "vendas";

interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;        // dark-mode neon
  colorLight: string;   // light-mode solid
  isCurrency: boolean;
  shortLabel: string;
}

const METRICS: Record<MetricKey, MetricConfig> = {
  faturamento: {
    key: "faturamento",
    label: "Faturamento",
    shortLabel: "Receita",
    color: "#22C55E",
    colorLight: "#059669",
    isCurrency: true,
  },
  leads: {
    key: "leads",
    label: "Leads",
    shortLabel: "Leads",
    color: "#3B82F6",
    colorLight: "#1D4ED8",
    isCurrency: false,
  },
  agendamentos: {
    key: "agendamentos",
    label: "Agendamentos",
    shortLabel: "Agendamentos",
    color: "#A855F7",
    colorLight: "#7E22CE",
    isCurrency: false,
  },
  vendas: {
    key: "vendas",
    label: "Vendas",
    shortLabel: "Vendas",
    color: "#FACC15",
    colorLight: "#CA8A04",
    isCurrency: false,
  },
};

const SCHEDULED_STATUSES = new Set([
  "Agendado",
  "Confirmado",
  "Compareceu",
  "Compareceu e Comprou",
  "Compareceu e Não Comprou",
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
 * Evolução dinâmica — tabs por métrica + comparação com período anterior.
 * Funciona em Light & Dark com cores semânticas.
 */
export function RevenueEvolutionChart({ leads }: Props) {
  const [metric, setMetric] = useState<MetricKey>("faturamento");
  const [compare, setCompare] = useState(false);

  const cfg = METRICS[metric];

  const data = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 29), end: today });
    const prevDays = eachDayOfInterval({
      start: subDays(today, 59),
      end: subDays(today, 30),
    });

    const compute = (day: Date): number => {
      switch (metric) {
        case "faturamento":
          return leads
            .filter(
              (l) =>
                l.status === "Compareceu e Comprou" &&
                isSameDay(parseISO(l.updated_at ?? l.created_at!), day)
            )
            .reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
        case "leads":
          return leads.filter(
            (l) => l.created_at && isSameDay(parseISO(l.created_at), day)
          ).length;
        case "agendamentos":
          return leads.filter(
            (l) =>
              l.status &&
              SCHEDULED_STATUSES.has(l.status) &&
              isSameDay(parseISO(l.updated_at ?? l.created_at!), day)
          ).length;
        case "vendas":
          return leads.filter(
            (l) =>
              l.status === "Compareceu e Comprou" &&
              isSameDay(parseISO(l.updated_at ?? l.created_at!), day)
          ).length;
      }
    };

    return days.map((d, i) => {
      const prev = prevDays[i];
      return {
        date: format(d, "dd MMM", { locale: ptBR }),
        fullDate: format(d, "dd 'de' MMMM, yyyy", { locale: ptBR }),
        atual: compute(d),
        anterior: prev ? compute(prev) : 0,
      };
    });
  }, [leads, metric]);

  const total = data.reduce((s, d) => s + d.atual, 0);
  const totalPrev = data.reduce((s, d) => s + d.anterior, 0);
  const delta =
    totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : total > 0 ? 100 : 0;

  return (
    <Card className="glass-card rounded-xl border border-border p-7">
      {/* Header com totais */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold mb-1.5">
            Evolução · {cfg.label}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
            Últimos 30 dias
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p
              className="font-mono-luxe text-2xl font-bold tabular-nums tracking-tighter leading-none"
              style={{ color: cfg.colorLight }}
            >
              <span className="dark:hidden">
                {formatValue(total, cfg.isCurrency)}
              </span>
              <span
                className="hidden dark:inline"
                style={{
                  color: cfg.color,
                  textShadow: `0 0 12px ${cfg.color}66`,
                }}
              >
                {formatValue(total, cfg.isCurrency)}
              </span>
            </p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-semibold mt-1.5">
              Total Período
            </p>
          </div>
          {compare && (
            <div className="text-right">
              <p
                className={cn(
                  "font-mono-luxe text-2xl font-bold tabular-nums tracking-tighter leading-none",
                  delta >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-semibold mt-1.5">
                vs Anterior
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs + Switch */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border"
          role="tablist"
        >
          {(Object.keys(METRICS) as MetricKey[]).map((k) => {
            const m = METRICS[k];
            const active = metric === k;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(k)}
                className={cn(
                  "text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all uppercase tracking-wider",
                  active
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={
                  active
                    ? {
                        boxShadow: `inset 0 0 0 1px ${m.color}40, 0 0 12px -4px ${m.color}80`,
                      }
                    : undefined
                }
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: active ? m.color : "currentColor" }}
                  />
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <Switch
            checked={compare}
            onCheckedChange={setCompare}
            aria-label="Comparar com período anterior"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Comparar c/ Período Anterior
          </span>
        </label>
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="metricGradientPrev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.color} stopOpacity={0.05} />
                <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
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
            <YAxis
              tick={{
                fontSize: 9,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                cfg.isCurrency
                  ? v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : `${v}`
                  : `${v}`
              }
              width={36}
            />
            <Tooltip
              cursor={{
                stroke: cfg.color,
                strokeOpacity: 0.4,
                strokeDasharray: "3 3",
              }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload as {
                  fullDate: string;
                  atual: number;
                  anterior: number;
                };
                return (
                  <div className="rounded-lg border border-border bg-popover/95 backdrop-blur-xl px-3.5 py-2.5 shadow-xl text-popover-foreground min-w-[180px]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">
                      {p.fullDate}
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        {cfg.shortLabel}
                      </span>
                      <span
                        className="font-mono-luxe text-sm font-bold tabular-nums"
                        style={{ color: cfg.color }}
                      >
                        {formatValue(p.atual, cfg.isCurrency)}
                      </span>
                    </div>
                    {compare && (
                      <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-border/60">
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span
                            className="h-2 w-2 rounded-full opacity-50"
                            style={{ backgroundColor: cfg.color }}
                          />
                          Anterior
                        </span>
                        <span className="font-mono-luxe text-sm font-semibold tabular-nums text-muted-foreground">
                          {formatValue(p.anterior, cfg.isCurrency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {compare && (
              <Area
                type="monotone"
                dataKey="anterior"
                stroke={cfg.color}
                strokeOpacity={0.45}
                strokeWidth={1.25}
                strokeDasharray="4 4"
                fill="url(#metricGradientPrev)"
                dot={false}
                isAnimationActive
              />
            )}
            <Area
              type="monotone"
              dataKey="atual"
              stroke={cfg.color}
              strokeWidth={2}
              fill="url(#metricGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: cfg.color,
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
              style={{ filter: `drop-shadow(0 0 6px ${cfg.color}80)` }}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
