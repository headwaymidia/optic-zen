import { useMemo } from "react";
import { Lead } from "@/lib/supabase";
import { differenceInMilliseconds, isWithinInterval, parseISO } from "date-fns";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  leads: Lead[];
  range: { from: Date; to: Date };
}

const SCHEDULED = ["Agendou Exame", "Compareceu e Comprou", "Compareceu e Não Comprou", "Não Compareceu"];
const ATTENDED = ["Compareceu e Comprou", "Compareceu e Não Comprou"];

function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? 100 : null;
  return ((current - prev) / prev) * 100;
}

/**
 * Linha minimalista de KPIs em formato "lista premium" — responde ao filtro de período.
 */
export function PeriodKPIRow({ leads, range }: Props) {
  const items = useMemo(() => {
    const ms = differenceInMilliseconds(range.to, range.from);
    const prevTo = new Date(range.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - ms);

    const inCur = (d?: string | null) =>
      !!d && isWithinInterval(parseISO(d), { start: range.from, end: range.to });
    const inPrev = (d?: string | null) =>
      !!d && isWithinInterval(parseISO(d), { start: prevFrom, end: prevTo });

    const totalCur = leads.filter((l) => inCur(l.created_at)).length;
    const totalPrev = leads.filter((l) => inPrev(l.created_at)).length;

    const agCur = leads.filter((l) => SCHEDULED.includes(l.status) && inCur(l.updated_at ?? l.created_at)).length;
    const agPrev = leads.filter((l) => SCHEDULED.includes(l.status) && inPrev(l.updated_at ?? l.created_at)).length;

    const atCur = leads.filter((l) => ATTENDED.includes(l.status) && inCur(l.updated_at ?? l.created_at)).length;
    const atPrev = leads.filter((l) => ATTENDED.includes(l.status) && inPrev(l.updated_at ?? l.created_at)).length;

    const vCur = leads.filter((l) => l.status === "Compareceu e Comprou" && inCur(l.updated_at ?? l.created_at)).length;
    const vPrev = leads.filter((l) => l.status === "Compareceu e Comprou" && inPrev(l.updated_at ?? l.created_at)).length;

    const aproveitamento = totalCur > 0 ? (agCur / totalCur) * 100 : 0;
    const aproveitamentoPrev = totalPrev > 0 ? (agPrev / totalPrev) * 100 : 0;
    const aproveitamentoDelta =
      aproveitamentoPrev === 0
        ? aproveitamento > 0
          ? 100
          : null
        : aproveitamento - aproveitamentoPrev; // pontos percentuais

    return [
      { label: "Total Leads", value: totalCur, delta: pctDelta(totalCur, totalPrev), accent: "yellow" as const, suffix: "" },
      { label: "Agendamentos", value: agCur, delta: pctDelta(agCur, agPrev), accent: "yellow" as const, suffix: "" },
      {
        label: "Aproveitamento de Leads",
        value: Number(aproveitamento.toFixed(1)),
        delta: aproveitamentoDelta,
        accent: "yellow" as const,
        suffix: "%",
        deltaUnit: "pp" as const,
      },
      { label: "Vendas (Faturamento)", value: vCur, delta: pctDelta(vCur, vPrev), accent: "green" as const, suffix: "" },
    ];
  }, [leads, range]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-card px-2 shadow-sm dark:shadow-none">
      {items.map((it) => {
        const positive = it.delta !== null && it.delta >= 0;
        const flat = it.delta === null || it.delta === 0;
        const Icon = flat ? Minus : positive ? ArrowUp : ArrowDown;
        const tone = flat
          ? "text-muted-foreground"
          : positive
          ? "text-emerald-600 dark:text-[#22C55E]"
          : "text-rose-500 dark:text-rose-400";
        // Dark: amarelo/verde neon. Light: cores sólidas escuras p/ contraste.
        const valueColorClass =
          it.accent === "green"
            ? "text-emerald-600 dark:text-[#22C55E]"
            : "text-amber-600 dark:text-[#FACC15]";
        const glowClass = it.accent === "green" ? "neon-glow-green" : "neon-glow-yellow";
        const deltaUnit = (it as { deltaUnit?: "pp" }).deltaUnit ?? "%";
        return (
          <div key={it.label} className="px-5 py-4 flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
              {it.label}
            </p>
            <div className="flex items-baseline gap-2.5">
              <span
                className={cn(
                  "font-mono-luxe text-3xl font-bold tabular-nums tracking-tight",
                  valueColorClass,
                  glowClass
                )}
              >
                {it.value}
                {it.suffix}
              </span>
              <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-mono-luxe font-semibold tabular-nums", tone)}>
                <Icon className="h-3 w-3" strokeWidth={2.5} />
                {it.delta === null ? "—" : `${Math.abs(it.delta).toFixed(deltaUnit === "pp" ? 1 : 0)}${deltaUnit}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-card px-2 shadow-sm dark:shadow-none">
      {items.map((it) => {
        const positive = it.delta !== null && it.delta >= 0;
        const flat = it.delta === null || it.delta === 0;
        const Icon = flat ? Minus : positive ? ArrowUp : ArrowDown;
        const tone = flat
          ? "text-muted-foreground"
          : positive
          ? "text-emerald-600 dark:text-[#22C55E]"
          : "text-rose-500 dark:text-rose-400";
        // Dark: amarelo/verde neon. Light: cores sólidas escuras p/ contraste.
        const valueColorClass =
          it.accent === "green"
            ? "text-emerald-600 dark:text-[#22C55E]"
            : "text-amber-600 dark:text-[#FACC15]";
        const glowClass = it.accent === "green" ? "neon-glow-green" : "neon-glow-yellow";
        return (
          <div key={it.label} className="px-5 py-4 flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
              {it.label}
            </p>
            <div className="flex items-baseline gap-2.5">
              <span
                className={cn(
                  "font-mono-luxe text-3xl font-bold tabular-nums tracking-tight",
                  valueColorClass,
                  glowClass
                )}
              >
                {it.value}
              </span>
              <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-mono-luxe font-semibold tabular-nums", tone)}>
                <Icon className="h-3 w-3" strokeWidth={2.5} />
                {it.delta === null ? "—" : `${Math.abs(it.delta).toFixed(0)}%`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
