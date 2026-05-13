import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles, CalendarCheck, UserCheck, Trophy, TrendingDown } from "lucide-react";

interface Props {
  leads: Lead[];
}

/**
 * Funil vertical gamificado — Jornada de níveis com barras de progresso
 * verticais e badges de "perda" entre cada andar (estilo level-stepper).
 */
export function VerticalJourneyFunnel({ leads }: Props) {
  const stages = useMemo(() => {
    const total = leads.length;
    const agendou = leads.filter((l) =>
      ["Agendou Exame", "Não Compareceu", "Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const compareceu = leads.filter((l) =>
      ["Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const comprou = leads.filter((l) => l.status === "Compareceu e Comprou").length;

    return [
      { key: "captacao", label: "Captação", count: total, Icon: Sparkles },
      { key: "agendou", label: "Agendamento", count: agendou, Icon: CalendarCheck },
      { key: "compareceu", label: "Comparecimento", count: compareceu, Icon: UserCheck },
      { key: "comprou", label: "Venda", count: comprou, Icon: Trophy },
    ];
  }, [leads]);

  const totalLeads = stages[0].count;
  const finalSales = stages[stages.length - 1].count;
  const overallConv = totalLeads > 0 ? (finalSales / totalLeads) * 100 : 0;
  const maxCount = Math.max(totalLeads, 1);

  return (
    <Card className="glass-card rounded-2xl border-0 h-full min-h-[520px] flex flex-col">
      <div className="px-7 pt-8 pb-4 flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1.5">
            Jornada
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
            Níveis de conversão
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono-luxe text-2xl font-bold tabular-nums tracking-tighter text-emerald-400 leading-none">
            {overallConv.toFixed(1)}%
          </p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-semibold mt-1.5">
            Total
          </p>
        </div>
      </div>

      {totalLeads === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground font-light">Sem leads no período.</p>
        </div>
      ) : (
        <div className="flex-1 px-7 pb-8 pt-2 flex flex-col gap-2">
          {stages.map((s, i) => {
            const Icon = s.Icon;
            const isLast = i === stages.length - 1;
            const fillPct = (s.count / maxCount) * 100;

            // Perda entre etapas
            const prev = i > 0 ? stages[i - 1].count : null;
            const lossCount = prev !== null ? Math.max(prev - s.count, 0) : 0;
            const lossPct = prev && prev > 0 ? (lossCount / prev) * 100 : 0;
            const stepConv = prev && prev > 0 ? (s.count / prev) * 100 : null;

            return (
              <div key={s.key}>
                {/* BADGE de perda entre etapas */}
                {i > 0 && (
                  <div className="flex items-center gap-2 pl-[60px] py-1.5">
                    <TrendingDown className="h-3 w-3 text-rose-400/70" strokeWidth={2} />
                    <span className="font-mono-luxe text-[10px] tabular-nums text-rose-400/80 font-semibold">
                      −{lossCount}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-semibold">
                      {lossPct.toFixed(0)}% perda
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-rose-400/20 to-transparent" />
                  </div>
                )}

                {/* NÍVEL — ícone + barra horizontal preenchendo */}
                <div className="flex items-center gap-4">
                  {/* Ícone com badge de nível */}
                  <div
                    className={cn(
                      "relative h-11 w-11 shrink-0 rounded-xl flex items-center justify-center backdrop-blur-md border transition-all",
                      s.count > 0
                        ? "bg-zinc-900/60 dark:bg-zinc-900/60 bg-zinc-100 border-white/10 dark:border-white/10 border-black/5"
                        : "bg-zinc-900/30 border-white/5",
                      isLast && s.count > 0 &&
                        "border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.30),inset_0_0_12px_rgba(16,185,129,0.10)]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4.5 w-4.5",
                        isLast && s.count > 0
                          ? "text-emerald-400"
                          : s.count > 0
                          ? "text-foreground"
                          : "text-zinc-600"
                      )}
                      strokeWidth={1.5}
                    />
                    {/* Badge de nível */}
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-background border border-white/10 dark:border-white/10 border-black/10 flex items-center justify-center font-mono-luxe text-[8px] font-bold tabular-nums text-zinc-400">
                      {i + 1}
                    </span>
                  </div>

                  {/* Conteúdo do nível */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold truncate">
                        {s.label}
                      </span>
                      <div className="flex items-baseline gap-2 shrink-0">
                        <span
                          className={cn(
                            "font-mono-luxe text-xl font-bold tabular-nums tracking-tighter leading-none",
                            isLast && s.count > 0 ? "text-emerald-400" : "text-foreground"
                          )}
                        >
                          {s.count}
                        </span>
                        {stepConv !== null && (
                          <span className="font-mono-luxe text-[10px] tabular-nums text-zinc-500 font-semibold">
                            {stepConv.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barra horizontal preenchendo (estilo level bar de jogo) */}
                    <div className="relative h-1.5 w-full rounded-full bg-white/5 dark:bg-white/5 bg-black/5 overflow-hidden">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all",
                          isLast && s.count > 0
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                            : "bg-gradient-to-r from-zinc-400 to-zinc-300 dark:from-zinc-300 dark:to-zinc-100"
                        )}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
