import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar } from "recharts";
import { Wallet, Users, CalendarPlus, Trophy, ArrowUp, ArrowDown } from "lucide-react";
import {
  eachDayOfInterval,
  isSameDay,
  parseISO,
  subDays,
  startOfMonth,
  subMonths,
  endOfMonth,
  isWithinInterval,
} from "date-fns";

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);
const EMERALD = "#10B981";
const ROSE = "#F43F5E";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? 100 : null;
  return ((current - prev) / prev) * 100;
}

interface BIProps {
  leads: Lead[];
  loading: boolean;
}

/**
 * BI Stats Row — 4 KPIs com sparklines e indicador de variação vs mês anterior.
 * Padrão ProfitWell / Stripe.
 */
export function BIStatsRow({ leads, loading }: BIProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const cmStart = startOfMonth(now);
    const pmStart = startOfMonth(subMonths(now, 1));
    const pmEnd = endOfMonth(subMonths(now, 1));

    const inCurrent = (d?: string | null) =>
      !!d && isWithinInterval(parseISO(d), { start: cmStart, end: now });
    const inPrev = (d?: string | null) =>
      !!d && isWithinInterval(parseISO(d), { start: pmStart, end: pmEnd });

    // Métricas mês corrente
    const buyersCM = leads.filter(
      (l) => l.status === "Compareceu e Comprou" && inCurrent(l.updated_at ?? l.created_at)
    );
    const faturamentoCM = buyersCM.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
    const totalLeadsCM = leads.filter((l) => inCurrent(l.created_at)).length;
    const agendCM = leads.filter(
      (l) =>
        ["Agendou Exame", "Compareceu e Comprou", "Compareceu e Não Comprou", "Não Compareceu"].includes(
          l.status
        ) && inCurrent(l.updated_at ?? l.created_at)
    ).length;
    const vendasCM = buyersCM.length;

    // Mês anterior
    const buyersPM = leads.filter(
      (l) => l.status === "Compareceu e Comprou" && inPrev(l.updated_at ?? l.created_at)
    );
    const faturamentoPM = buyersPM.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
    const totalLeadsPM = leads.filter((l) => inPrev(l.created_at)).length;
    const agendPM = leads.filter(
      (l) =>
        ["Agendou Exame", "Compareceu e Comprou", "Compareceu e Não Comprou", "Não Compareceu"].includes(
          l.status
        ) && inPrev(l.updated_at ?? l.created_at)
    ).length;
    const vendasPM = buyersPM.length;

    // Sparkline 14 dias
    const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
    const spark = days.map((d) => {
      const dayLeads = leads.filter((l) => l.created_at && isSameDay(parseISO(l.created_at), d));
      const dayBuyers = leads.filter(
        (l) =>
          l.status === "Compareceu e Comprou" &&
          isSameDay(parseISO(l.updated_at ?? l.created_at!), d)
      );
      const dayAgend = leads.filter(
        (l) =>
          ["Agendou Exame", "Compareceu e Comprou", "Compareceu e Não Comprou", "Não Compareceu"].includes(
            l.status
          ) && isSameDay(parseISO(l.updated_at ?? l.created_at!), d)
      );
      return {
        leads: dayLeads.length,
        agend: dayAgend.length,
        vendas: dayBuyers.length,
        receita: dayBuyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0),
      };
    });

    return [
      {
        key: "fat",
        label: "Total Faturamento",
        value: formatBRL(faturamentoCM),
        delta: pctDelta(faturamentoCM, faturamentoPM),
        Icon: Wallet,
        sparkData: spark,
        sparkKey: "receita" as const,
        chartType: "line" as const,
        color: EMERALD,
      },
      {
        key: "leads",
        label: "Total de Leads",
        value: totalLeadsCM.toString(),
        delta: pctDelta(totalLeadsCM, totalLeadsPM),
        Icon: Users,
        sparkData: spark,
        sparkKey: "leads" as const,
        chartType: "bar" as const,
        color: EMERALD,
      },
      {
        key: "agend",
        label: "Novos Agendamentos",
        value: agendCM.toString(),
        delta: pctDelta(agendCM, agendPM),
        Icon: CalendarPlus,
        sparkData: spark,
        sparkKey: "agend" as const,
        chartType: "bar" as const,
        color: EMERALD,
      },
      {
        key: "vendas",
        label: "Vendas Concluídas",
        value: vendasCM.toString(),
        delta: pctDelta(vendasCM, vendasPM),
        Icon: Trophy,
        sparkData: spark,
        sparkKey: "vendas" as const,
        chartType: "line" as const,
        color: EMERALD,
      },
    ];
  }, [leads]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {stats.map((s) => {
        const Icon = s.Icon;
        const positive = s.delta !== null && s.delta >= 0;
        const deltaColor =
          s.delta === null
            ? "text-zinc-500"
            : positive
            ? "text-emerald-400"
            : "text-rose-400";
        const DeltaIcon = positive ? ArrowUp : ArrowDown;

        return (
          <Card
            key={s.key}
            className="glass-card rounded-xl border-0 p-5 relative overflow-hidden group hover:border-emerald-500/20 transition-all"
          >
            {/* Header — label + ícone */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 truncate">
                {s.label}
              </p>
              <Icon className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
            </div>

            {/* Valor + delta */}
            <div className="flex items-end justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[28px] font-semibold tabular-nums tracking-tighter text-foreground leading-none truncate">
                  {loading ? "—" : s.value}
                </p>
                <div className={`flex items-center gap-1 mt-2 ${deltaColor}`}>
                  <DeltaIcon className="h-3 w-3" strokeWidth={2.5} />
                  <span className="font-mono-luxe text-[11px] font-bold tabular-nums">
                    {s.delta === null ? "—" : `${Math.abs(s.delta).toFixed(0)}%`}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-semibold ml-1">
                    vs mês ant.
                  </span>
                </div>
              </div>
            </div>

            {/* Sparkline */}
            <div className="h-[36px] w-full -mx-1 -mb-1 opacity-90">
              <ResponsiveContainer width="100%" height="100%">
                {s.chartType === "line" ? (
                  <LineChart data={s.sparkData}>
                    <Line
                      type="monotone"
                      dataKey={s.sparkKey}
                      stroke={positive ? EMERALD : ROSE}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={s.sparkData}>
                    <Bar
                      dataKey={s.sparkKey}
                      fill={positive ? EMERALD : ROSE}
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
