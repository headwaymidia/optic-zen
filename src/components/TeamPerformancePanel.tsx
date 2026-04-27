import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  differenceInMinutes,
  endOfMonth,
  getDate,
  getDaysInMonth,
  isSameMonth,
  parseISO,
  startOfMonth,
} from "date-fns";
import {
  Target,
  Zap,
  UserCheck,
  CalendarClock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHLY_GOAL = 30000; // R$ 30k — meta padrão da ótica

const PENDING_STATUSES = new Set([
  "Novo",
  "Em Contato",
  "Agendou Exame",
]);

function formatBRL(v: number, compact = false) {
  if (compact && v >= 1000) {
    return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

interface Props {
  leads: Lead[];
}

/**
 * Painel de Tração & Performance da Equipe.
 * Substitui "Origem dos Leads".
 *  1) Gauge: Meta do Mês
 *  2) Métricas de eficiência (ocupação, TMR, agendamentos pendentes)
 *  3) Pulso do Mês (dias decorridos vs receita realizada)
 */
export function TeamPerformancePanel({ leads }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Vendas do mês
    const monthSales = leads.filter(
      (l) =>
        l.status === "Compareceu e Comprou" &&
        l.updated_at &&
        isSameMonth(parseISO(l.updated_at), now)
    );
    const revenue = monthSales.reduce(
      (s, l) => s + (Number(l.sale_value) || 0),
      0
    );
    const goalPct = Math.min(100, (revenue / MONTHLY_GOAL) * 100);

    // Pulso do Mês
    const dayOfMonth = getDate(now);
    const totalDays = getDaysInMonth(now);
    const monthProgressPct = (dayOfMonth / totalDays) * 100;
    const behind = goalPct + 4 < monthProgressPct; // tolerância 4pp

    // Leads ativos (não fechados)
    const activeLeads = leads.filter(
      (l) =>
        l.status !== "Compareceu e Comprou" &&
        l.status !== "Compareceu e Não Comprou" &&
        l.status !== "Não Compareceu"
    );

    // Taxa de Ocupação por vendedor
    const sellerLoad = new Map<string, number>();
    activeLeads.forEach((l) => {
      if (!l.assigned_to) return;
      sellerLoad.set(l.assigned_to, (sellerLoad.get(l.assigned_to) ?? 0) + 1);
    });
    const sellersCount = sellerLoad.size;
    const avgLoad =
      sellersCount > 0
        ? Math.round(activeLeads.length / sellersCount)
        : activeLeads.length;
    const topSeller = [...sellerLoad.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Tempo médio até primeiro contato (created_at -> last_interaction)
    const responseTimes: number[] = [];
    leads.forEach((l) => {
      if (!l.created_at || !l.last_interaction) return;
      const created = parseISO(l.created_at);
      const first = parseISO(l.last_interaction);
      const diff = differenceInMinutes(first, created);
      if (diff >= 0 && diff < 60 * 24 * 7) responseTimes.push(diff);
    });
    const avgResponse =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length
          )
        : 0;

    // Agendamentos pendentes (Novo / Em Contato / Agendou Exame)
    const pending = leads.filter(
      (l) => l.status && PENDING_STATUSES.has(l.status)
    ).length;

    return {
      revenue,
      goalPct,
      dayOfMonth,
      totalDays,
      monthProgressPct,
      behind,
      activeLeads: activeLeads.length,
      sellersCount,
      avgLoad,
      topSeller,
      avgResponse,
      pending,
      monthStart,
      monthEnd,
    };
  }, [leads]);

  const gaugeData = [{ name: "meta", value: stats.goalPct, fill: "#22C55E" }];

  // Cor adaptativa do tempo de resposta
  const responseColor =
    stats.avgResponse <= 5
      ? "text-emerald-600 dark:text-emerald-400"
      : stats.avgResponse <= 30
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  return (
    <Card className="glass-card rounded-2xl p-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
            <Target className="h-3 w-3" />
            Tração & Equipe
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
            Meta · Eficiência · Pulso do mês
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.25em] text-muted-foreground/70 font-semibold">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </div>
      </div>

      {/* 1) Gauge de Meta */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative h-[170px] w-[170px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="78%"
              outerRadius="100%"
              data={gaugeData}
              startAngle={210}
              endAngle={-30}
              barSize={14}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              {/* trilho */}
              <RadialBar
                background={{ fill: "hsl(var(--muted))" } as never}
                dataKey="value"
                cornerRadius={20}
                fill="#22C55E"
                style={{ filter: "drop-shadow(0 0 8px #22C55E80)" }}
                isAnimationActive
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-mono-luxe text-[11px] font-semibold tabular-nums text-muted-foreground"
              title="Faturado / Meta"
            >
              {formatBRL(stats.revenue, true)}
            </span>
            <span className="font-mono-luxe text-3xl font-bold tabular-nums text-foreground tracking-tighter leading-none mt-0.5">
              {stats.goalPct.toFixed(0)}%
            </span>
            <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground font-semibold mt-1">
              de {formatBRL(MONTHLY_GOAL, true)}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-bold mb-1">
              Meta do Mês
            </p>
            <p className="text-[11px] text-foreground/80 leading-snug">
              <span className="font-mono-luxe font-bold text-foreground">
                {formatBRL(stats.revenue)}
              </span>{" "}
              de{" "}
              <span className="font-mono-luxe text-muted-foreground">
                {formatBRL(MONTHLY_GOAL)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            {stats.behind ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30 font-bold uppercase tracking-wider">
                <AlertTriangle className="h-3 w-3" />
                Abaixo do esperado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                <TrendingUp className="h-3 w-3" />
                No ritmo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3) Pulso do Mês */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-bold">
          <span className="text-muted-foreground">Pulso do Mês</span>
          <span className="font-mono-luxe tabular-nums text-foreground">
            Dia {stats.dayOfMonth}/{stats.totalDays}
          </span>
        </div>
        <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden">
          {/* barra de dias decorridos */}
          <div
            className="absolute inset-y-0 left-0 bg-muted-foreground/30 rounded-full"
            style={{ width: `${stats.monthProgressPct}%` }}
          />
          {/* barra de receita */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all",
              stats.behind
                ? "bg-yellow-500"
                : "bg-emerald-500"
            )}
            style={{
              width: `${stats.goalPct}%`,
              boxShadow: stats.behind
                ? "0 0 10px #FACC15AA"
                : "0 0 10px #22C55EAA",
            }}
          />
          {/* marcador de hoje */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3.5 w-px bg-foreground/70"
            style={{ left: `${stats.monthProgressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/70 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Receita {stats.goalPct.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
            Tempo {stats.monthProgressPct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 2) Grid de Eficiência */}
      <div className="grid grid-cols-3 gap-2.5 pt-5 border-t border-border/60">
        <EfficiencyCell
          icon={<UserCheck className="h-3.5 w-3.5" />}
          label="Ocupação"
          value={stats.avgLoad.toString()}
          hint={
            stats.sellersCount > 0
              ? `${stats.activeLeads} ativos / ${stats.sellersCount} vend.`
              : "sem atribuição"
          }
          colorClass="text-foreground"
        />
        <EfficiencyCell
          icon={<Zap className="h-3.5 w-3.5" />}
          label="1º Contato"
          value={
            stats.avgResponse > 0
              ? stats.avgResponse < 60
                ? `${stats.avgResponse}min`
                : `${(stats.avgResponse / 60).toFixed(1)}h`
              : "—"
          }
          hint={
            stats.avgResponse <= 5
              ? "excelente"
              : stats.avgResponse <= 30
                ? "atenção"
                : "lento"
          }
          colorClass={responseColor}
          glow={
            stats.avgResponse <= 5 && stats.avgResponse > 0
              ? "#22C55E"
              : undefined
          }
        />
        <EfficiencyCell
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Pendentes"
          value={stats.pending.toString()}
          hint={
            stats.topSeller
              ? `top: ${stats.topSeller[0].split(" ")[0]}`
              : "agendar"
          }
          colorClass="text-foreground"
        />
      </div>
    </Card>
  );
}

function EfficiencyCell({
  icon,
  label,
  value,
  hint,
  colorClass,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  colorClass: string;
  glow?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 dark:bg-white/[0.02] border border-border/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
        {icon}
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-mono-luxe text-xl font-bold tabular-nums tracking-tighter leading-none",
          colorClass
        )}
        style={glow ? { textShadow: `0 0 10px ${glow}80` } : undefined}
      >
        {value}
      </p>
      <p className="text-[9px] text-muted-foreground/70 font-medium mt-1.5 truncate">
        {hint}
      </p>
    </div>
  );
}
