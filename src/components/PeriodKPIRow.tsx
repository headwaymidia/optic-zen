import { useMemo } from "react";
import { Lead } from "@/integrations/supabase/client";
import { differenceInMilliseconds, isWithinInterval } from "date-fns";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  leads: Lead[];
  range: { from: Date; to: Date };
  inline?: boolean;
}

const SCHEDULED = [
  "Agendou Exame",
  "Compareceu e Comprou",
  "Compareceu e Não Comprou",
  "Não Compareceu",
];

function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? 100 : null;
  return ((current - prev) / prev) * 100;
}

/**
 * Linha de Métricas de Volume — Apple Design.
 * 3 cards discretos: Leads, Agendamentos, Vendas Concluídas (qty).
 */
export function PeriodKPIRow({ leads, range, inline = false }: Props) {
  const items = useMemo(() => {
    const ms = differenceInMilliseconds(range.to, range.from);
    const prevTo = new Date(range.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - ms);

    const inCur = (d?: string | null) =>
      !!d && isWithinInterval(new Date(d), { start: range.from, end: range.to });
    const inPrev = (d?: string | null) =>
      !!d && isWithinInterval(new Date(d), { start: prevFrom, end: prevTo });

    const totalCur = leads.filter((l) => inCur(l.created_at)).length;
    const totalPrev = leads.filter((l) => inPrev(l.created_at)).length;

    const agCur = leads.filter(
      (l) => SCHEDULED.includes(l.status) && inCur(l.updated_at ?? l.created_at)
    ).length;
    const agPrev = leads.filter(
      (l) => SCHEDULED.includes(l.status) && inPrev(l.updated_at ?? l.created_at)
    ).length;

    const vCur = leads.filter(
      (l) =>
        l.status === "Compareceu e Comprou" &&
        inCur(l.updated_at ?? l.created_at)
    ).length;
    const vPrev = leads.filter(
      (l) =>
        l.status === "Compareceu e Comprou" &&
        inPrev(l.updated_at ?? l.created_at)
    ).length;

    return [
      { label: "Total de Leads", value: totalCur, delta: pctDelta(totalCur, totalPrev) },
      { label: "Agendamentos", value: agCur, delta: pctDelta(agCur, agPrev) },
      { label: "Vendas Concluídas", value: vCur, delta: pctDelta(vCur, vPrev) },
    ];
  }, [leads, range]);

  const cards = items.map((it) => {
    const positive = it.delta !== null && it.delta >= 0;
    const flat = it.delta === null || it.delta === 0;
    const Icon = flat ? Minus : positive ? ArrowUp : ArrowDown;
    const tone = flat
      ? "text-zinc-400 dark:text-zinc-500"
      : positive
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-500 dark:text-rose-400";

    return (
      <div
        key={it.label}
        className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#111111] shadow-sm dark:shadow-none px-5 py-5 h-full flex flex-col justify-between"
        style={{
          fontFamily:
            "'Inter','Geist Sans',-apple-system,BlinkMacSystemFont,sans-serif",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-500 font-medium mb-2">
          {it.label}
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className="text-[28px] font-bold tabular-nums tracking-tighter leading-none text-[#1D1D1F] dark:text-white"
            style={{ fontFeatureSettings: "'tnum'" }}
          >
            {it.value}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
              tone
            )}
          >
            <Icon className="h-3 w-3" strokeWidth={2.5} />
            {it.delta === null
              ? "—"
              : `${Math.abs(it.delta).toFixed(0)}%`}
          </span>
        </div>
      </div>
    );
  });

  if (inline) return <>{cards}</>;

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      style={{
        fontFamily:
          "'Inter','Geist Sans',-apple-system,BlinkMacSystemFont,sans-serif",
      }}
    >
      {cards}
    </div>
  );
}

