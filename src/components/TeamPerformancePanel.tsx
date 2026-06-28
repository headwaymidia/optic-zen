import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import { useStoreMembers } from "@/hooks/useStoreMembers";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  differenceInMinutes,
  endOfMonth,
  getDate,
  getDaysInMonth,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  Zap,
  UserCheck,
  CalendarClock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PENDING_STATUSES = new Set([
  "Novo",
  "Em Contato",
  "Agendou Exame",
]);

const SCHEDULED_STATUSES = new Set([
  "Agendou Exame",
  "Compareceu e Comprou",
  "Compareceu e Não Comprou",
  "Não Compareceu",
]);

// paleta vibrante para vendedores (sem cor atrelada à origem)
const SELLER_PALETTE = [
  "#22C55E",
  "#FACC15",
  "#06B6D4",
  "#A855F7",
  "#F97316",
  "#EC4899",
  "#3B82F6",
  "#10B981",
];

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
 * Painel de Tração & Equipe — Plug-and-Play.
 *  1) Ritmo (Pace): faturamento MTD vs mesmo período do mês anterior + projeção
 *  2) Donut: distribuição de carga por vendedor
 *  3) Métricas de eficiência (ocupação, TMR, pendentes)
 *  4) Alertas automáticos de funil
 */
export function TeamPerformancePanel({ leads }: Props) {
  const { nameById } = useStoreMembers();
  const stats = useMemo(() => {
    const resolveName = (id: string) => nameById.get(id) ?? "Vendedora";
    const now = new Date();
    const dayOfMonth = getDate(now);
    const totalDays = getDaysInMonth(now);

    // --- 1) PACE: vendas MTD vs mesmo período do mês anterior ---
    const monthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthSameDayCutoff = new Date(
      prevMonthStart.getFullYear(),
      prevMonthStart.getMonth(),
      Math.min(dayOfMonth, getDaysInMonth(prevMonthStart)),
      23,
      59,
      59
    );
    const prevMonthFullEnd = endOfMonth(prevMonthStart);

    const sumSales = (from: Date, to: Date) =>
      leads
        .filter((l) => {
          if (l.status !== "Compareceu e Comprou") return false;
          // data da venda (sale_date), fallback updated_at p/ vendas antigas
          const d = new Date(l.sale_date ?? l.updated_at ?? l.created_at);
          return isWithinInterval(d, { start: from, end: to });
        })
        .reduce((s, l) => s + (Number(l.sale_value) || 0), 0);

    const mtdRevenue = sumSales(monthStart, now);
    const prevMtdRevenue = sumSales(prevMonthStart, prevMonthSameDayCutoff);
    const prevMonthTotal = sumSales(prevMonthStart, prevMonthFullEnd);

    const paceDelta =
      prevMtdRevenue > 0
        ? ((mtdRevenue - prevMtdRevenue) / prevMtdRevenue) * 100
        : mtdRevenue > 0
          ? 100
          : 0;

    // Projeção linear pro fim do mês
    const projected =
      dayOfMonth > 0 ? (mtdRevenue / dayOfMonth) * totalDays : 0;
    const projectionDelta =
      prevMonthTotal > 0
        ? ((projected - prevMonthTotal) / prevMonthTotal) * 100
        : projected > 0
          ? 100
          : 0;

    // --- 2) Carga por vendedor (apenas leads ativos) ---
    const activeLeads = leads.filter(
      (l) =>
        l.status !== "Compareceu e Comprou" &&
        l.status !== "Compareceu e Não Comprou" &&
        l.status !== "Não Compareceu"
    );
    const loadMap = new Map<string, number>();
    activeLeads.forEach((l) => {
      if (!l.responsible_id) return;
      loadMap.set(l.responsible_id, (loadMap.get(l.responsible_id) ?? 0) + 1);
    });
    const sellerData = [...loadMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, value], i) => ({
        name: resolveName(id),
        value,
        color: SELLER_PALETTE[i % SELLER_PALETTE.length],
      }));
    const totalAssigned = sellerData.reduce((s, d) => s + d.value, 0);
    const unassigned = activeLeads.length - totalAssigned;

    // Equilíbrio: desvio do top vs média
    const avgLoad =
      sellerData.length > 0 ? totalAssigned / sellerData.length : 0;
    const top = sellerData[0];
    const imbalance =
      top && avgLoad > 0 ? ((top.value - avgLoad) / avgLoad) * 100 : 0;

    // --- 3) Eficiência ---
    const responseTimes: number[] = [];
    leads.forEach((l) => {
      if (!l.created_at || !l.last_interaction) return;
      const created = new Date(l.created_at);
      const interactionRef = l.last_interaction ?? l.last_follow_up_at ?? l.created_at;
      const first = new Date(interactionRef);
      const diff = differenceInMinutes(first, created);
      if (diff >= 0 && diff < 60 * 24 * 7) responseTimes.push(diff);
    });
    const avgResponse =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length
          )
        : 0;

    const pending = leads.filter(
      (l) => l.status && PENDING_STATUSES.has(l.status)
    ).length;

    // --- 4) Alertas automáticos baseados no funil do mês ---
    const monthLeads = leads.filter(
      (l) => l.created_at && isSameMonth(new Date(l.created_at), now)
    );
    const monthScheduled = leads.filter(
      (l) =>
        l.status &&
        SCHEDULED_STATUSES.has(l.status) &&
        l.updated_at &&
        isSameMonth(new Date(l.updated_at), now)
    );
    const monthSales = leads.filter(
      (l) =>
        l.status === "Compareceu e Comprou" &&
        (l.sale_date ?? l.updated_at) &&
        isSameMonth(new Date(l.sale_date ?? l.updated_at!), now)
    );

    const schedRate =
      monthLeads.length > 0
        ? (monthScheduled.length / monthLeads.length) * 100
        : 0;
    const closeRate =
      monthScheduled.length > 0
        ? (monthSales.length / monthScheduled.length) * 100
        : 0;

    const alerts: { tone: "warn" | "danger" | "ok"; text: string }[] = [];
    if (monthLeads.length >= 5 && schedRate < 30) {
      alerts.push({
        tone: "warn",
        text: `Baixa conversão em agendamentos (${schedRate.toFixed(0)}%)`,
      });
    }
    if (monthScheduled.length >= 5 && closeRate < 10) {
      alerts.push({
        tone: "danger",
        text: `Equipe com dificuldade no fechamento (${closeRate.toFixed(0)}%)`,
      });
    }
    if (avgResponse > 30 && responseTimes.length >= 3) {
      alerts.push({
        tone: "warn",
        text: `Tempo de 1º contato alto (${avgResponse}min)`,
      });
    }
    if (imbalance > 60 && sellerData.length > 1) {
      alerts.push({
        tone: "warn",
        text: `Carga desbalanceada: ${top.name.split(" ")[0]} +${imbalance.toFixed(0)}% acima da média`,
      });
    }
    if (alerts.length === 0 && monthLeads.length > 0) {
      alerts.push({
        tone: "ok",
        text: "Funil saudável — sem pontos de atenção críticos",
      });
    }

    return {
      mtdRevenue,
      prevMtdRevenue,
      paceDelta,
      projected,
      projectionDelta,
      dayOfMonth,
      totalDays,
      sellerData,
      totalAssigned,
      unassigned,
      avgLoad,
      avgResponse,
      pending,
      alerts,
      monthLeadsCount: monthLeads.length,
      monthScheduledCount: monthScheduled.length,
      monthSalesCount: monthSales.length,
    };
  }, [leads, nameById]);

  const responseColor =
    stats.avgResponse <= 5
      ? "text-emerald-600 dark:text-emerald-400"
      : stats.avgResponse <= 30
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const paceUp = stats.paceDelta >= 0;
  const projUp = stats.projectionDelta >= 0;

  return (
    <Card className="glass-card rounded-2xl p-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
            <Activity className="h-3 w-3" />
            Tração & Equipe
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
            Análise automática · sem metas manuais
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

      {/* 1) RITMO (PACE) */}
      <div
        className={cn(
          "rounded-xl p-4 mb-5 border backdrop-blur-sm",
          paceUp
            ? "bg-emerald-500/[0.06] border-emerald-500/30"
            : "bg-yellow-500/[0.06] border-yellow-500/30"
        )}
        style={{
          boxShadow: paceUp
            ? "0 0 24px -10px rgba(34,197,94,0.5)"
            : "0 0 24px -10px rgba(250,204,21,0.5)",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-bold mb-1">
              Ritmo de Crescimento
            </p>
            <p className="text-[11px] text-foreground/80 leading-snug">
              MTD:{" "}
              <span className="font-mono-luxe font-bold text-foreground">
                {formatBRL(stats.mtdRevenue, true)}
              </span>{" "}
              <span className="text-muted-foreground">vs</span>{" "}
              <span className="font-mono-luxe text-muted-foreground">
                {formatBRL(stats.prevMtdRevenue, true)}
              </span>{" "}
              <span className="text-muted-foreground/70 text-[10px]">
                (mesmo dia mês anterior)
              </span>
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold tabular-nums",
              paceUp
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                : "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/40"
            )}
          >
            {paceUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {paceUp ? "+" : ""}
            {stats.paceDelta.toFixed(1)}%
          </span>
        </div>

        <p className="text-[12px] text-foreground/90 font-medium leading-snug">
          {projUp ? "📈" : "⚠️"}{" "}
          <span className="font-semibold">
            Tendência de {projUp ? "+" : ""}
            {stats.projectionDelta.toFixed(0)}%
          </span>{" "}
          {projUp ? "de crescimento" : "abaixo do mês anterior"} para o fim do
          mês{" "}
          <span className="text-muted-foreground">
            (proj. {formatBRL(stats.projected, true)})
          </span>
        </p>

        <p className="text-[9px] text-muted-foreground/70 mt-2 uppercase tracking-[0.2em] font-semibold">
          Dia {stats.dayOfMonth}/{stats.totalDays} · projeção linear
        </p>
      </div>

      {/* 2) DONUT — Carga de trabalho por vendedor */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-bold flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            Distribuição de Carga
          </p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold">
            {stats.totalAssigned} leads ativos
            {stats.unassigned > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                · {stats.unassigned} s/ resp.
              </span>
            )}
          </p>
        </div>

        {stats.sellerData.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center text-[11px] text-muted-foreground font-light rounded-lg bg-muted/30 border border-border/50">
            Sem leads atribuídos a vendedores.
          </div>
        ) : (
          <div className="flex items-center gap-5 h-[160px]">
            <div className="relative h-full w-[150px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v: number, n: string) => [
                      `${v} leads (${((v / stats.totalAssigned) * 100).toFixed(0)}%)`,
                      n,
                    ]}
                  />
                  <Pie
                    data={stats.sellerData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {stats.sellerData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono-luxe text-2xl font-bold tabular-nums text-foreground tracking-tighter leading-none">
                  {stats.sellerData.length}
                </span>
                <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground font-semibold mt-1">
                  vendedores
                </span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 max-h-full overflow-hidden">
              {stats.sellerData.slice(0, 5).map((d) => {
                const p = (d.value / stats.totalAssigned) * 100;
                return (
                  <div
                    key={d.name}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: d.color,
                        boxShadow: `0 0 6px ${d.color}80`,
                      }}
                    />
                    <span className="text-[11px] text-foreground/80 font-medium truncate flex-1">
                      {d.name}
                    </span>
                    <span className="font-mono-luxe text-[11px] tabular-nums text-foreground font-semibold">
                      {p.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
              {stats.sellerData.length > 5 && (
                <p className="text-[9px] text-muted-foreground/70 italic mt-0.5">
                  +{stats.sellerData.length - 5} outros
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3) Eficiência */}
      <div className="grid grid-cols-3 gap-2.5 pt-5 border-t border-border/60">
        <EfficiencyCell
          icon={<UserCheck className="h-3.5 w-3.5" />}
          label="Ocupação"
          value={stats.avgLoad > 0 ? Math.round(stats.avgLoad).toString() : "—"}
          hint="média/vendedor"
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
          hint="aguardando ação"
          colorClass="text-foreground"
        />
      </div>

      {/* 4) Pontos de Atenção automáticos */}
      <div className="pt-5 mt-5 border-t border-border/60">
        <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-bold mb-2.5 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Pontos de Atenção
        </p>
        <div className="space-y-1.5">
          {stats.alerts.map((a, i) => (
            <AlertRow key={i} tone={a.tone} text={a.text} />
          ))}
        </div>
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

function AlertRow({
  tone,
  text,
}: {
  tone: "warn" | "danger" | "ok";
  text: string;
}) {
  const styles = {
    warn: {
      bg: "bg-yellow-500/10 border-yellow-500/30",
      text: "text-yellow-700 dark:text-yellow-400",
      dot: "#FACC15",
    },
    danger: {
      bg: "bg-red-500/10 border-red-500/30",
      text: "text-red-700 dark:text-red-400",
      dot: "#EF4444",
    },
    ok: {
      bg: "bg-emerald-500/10 border-emerald-500/30",
      text: "text-emerald-700 dark:text-emerald-400",
      dot: "#22C55E",
    },
  }[tone];

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md border px-3 py-2 backdrop-blur-sm",
        styles.bg
      )}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: styles.dot, boxShadow: `0 0 8px ${styles.dot}` }}
      />
      <p className={cn("text-[11px] font-semibold leading-snug", styles.text)}>
        {text}
      </p>
    </div>
  );
}
