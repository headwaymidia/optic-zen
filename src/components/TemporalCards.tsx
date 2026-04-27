import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, subWeeks, parseISO, isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Lead } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function countInRange(leads: Lead[], from: Date, to: Date) {
  return leads.filter((l) => {
    if (!l.created_at) return false;
    const d = parseISO(l.created_at);
    return isWithinInterval(d, { start: from, end: to });
  }).length;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function Trend({ pct }: { pct: number }) {
  const Icon = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
  const color = pct > 0 ? "text-emerald-600" : pct < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", color)}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function TemporalCards({ leads }: { leads: Lead[] }) {
  const now = new Date();

  const todayCount = countInRange(leads, startOfDay(now), endOfDay(now));
  const yesterdayCount = countInRange(leads, startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1)));

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekCount = countInRange(leads, weekStart, weekEnd);
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekCount = countInRange(leads, lastWeekStart, lastWeekEnd);

  const monthCount = countInRange(leads, startOfMonth(now), endOfMonth(now));
  const monthName = format(now, "MMMM", { locale: ptBR });

  const cards = [
    {
      label: "Entradas de hoje",
      value: todayCount,
      caption: "vs. ontem",
      trend: pctChange(todayCount, yesterdayCount),
    },
    {
      label: "Total da semana",
      value: weekCount,
      caption: "vs. semana passada",
      trend: pctChange(weekCount, lastWeekCount),
    },
    {
      label: `Total do mês`,
      value: monthCount,
      caption: `${monthCount} leads em ${monthName}`,
      trend: null as number | null,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground capitalize">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
              {c.trend !== null && <Trend pct={c.trend} />}
              <span className="capitalize">{c.caption}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Versão compacta horizontal: 3 mini-cards finos para o topo do Dashboard. */
export function TemporalCardsCompact({ leads }: { leads: Lead[] }) {
  const now = new Date();
  const todayCount = countInRange(leads, startOfDay(now), endOfDay(now));
  const yesterdayCount = countInRange(leads, startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1)));

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekCount = countInRange(leads, weekStart, weekEnd);
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekCount = countInRange(leads, lastWeekStart, lastWeekEnd);

  const monthCount = countInRange(leads, startOfMonth(now), endOfMonth(now));

  const items = [
    { label: "Hoje", value: todayCount, trend: pctChange(todayCount, yesterdayCount) },
    { label: "Semana", value: weekCount, trend: pctChange(weekCount, lastWeekCount) },
    { label: "Mês", value: monthCount, trend: null as number | null },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((c) => (
        <div
          key={c.label}
          className="flex items-center justify-between gap-2 rounded-lg border border-border dark:border-white/5 bg-card px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
              {c.label}
            </p>
            <p className="text-lg font-black tabular-nums tracking-tight leading-none mt-1 text-foreground">
              {c.value}
            </p>
          </div>
          {c.trend !== null && <Trend pct={c.trend} />}
        </div>
      ))}
    </div>
  );
}
