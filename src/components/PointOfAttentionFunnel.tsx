import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import { Sparkles, CalendarCheck, UserCheck, Trophy, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  leads: Lead[];
}

/**
 * Funil horizontal "Point of Attention".
 * Etapas conectadas por linhas neon esmeralda + alerta no maior gargalo.
 */
export function PointOfAttentionFunnel({ leads }: Props) {
  const { stages, bottleneckIdx, transitions } = useMemo(() => {
    const total = leads.length;
    const ag = leads.filter((l) =>
      ["Agendou Exame", "Não Compareceu", "Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const at = leads.filter((l) =>
      ["Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const vd = leads.filter((l) => l.status === "Compareceu e Comprou").length;

    const stages = [
      { key: "leads", label: "Leads", count: total, Icon: Sparkles },
      { key: "ag", label: "Agendados", count: ag, Icon: CalendarCheck },
      { key: "at", label: "Compareceram", count: at, Icon: UserCheck },
      { key: "vd", label: "Compraram", count: vd, Icon: Trophy },
    ];

    const transitions = stages.slice(1).map((s, i) => {
      const prev = stages[i].count;
      const conv = prev > 0 ? (s.count / prev) * 100 : 0;
      const loss = 100 - conv;
      return { from: stages[i].label, to: s.label, conv, loss };
    });

    let bottleneckIdx = -1;
    let worstLoss = -1;
    transitions.forEach((t, i) => {
      if (stages[i].count > 0 && t.loss > worstLoss) {
        worstLoss = t.loss;
        bottleneckIdx = i;
      }
    });

    return { stages, bottleneckIdx, transitions };
  }, [leads]);

  const overall =
    stages[0].count > 0 ? (stages[stages.length - 1].count / stages[0].count) * 100 : 0;
  const bottleneck = bottleneckIdx >= 0 ? transitions[bottleneckIdx] : null;

  return (
    <Card className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl p-7">
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold mb-1.5">
            Funil · Point of Attention
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
            Conversão entre etapas
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono-luxe text-2xl font-bold tabular-nums tracking-tighter text-emerald-500 dark:text-emerald-400 leading-none">
            {overall.toFixed(1)}%
          </p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/70 font-semibold mt-1.5">
            Conversão Total
          </p>
        </div>
      </div>

      {stages[0].count === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Sem leads no período.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-2">
            {stages.map((s, i) => {
              const Icon = s.Icon;
              const t = i > 0 ? transitions[i - 1] : null;
              const isBottleneck = i > 0 && i - 1 === bottleneckIdx;
              return (
                <div key={s.key} className="contents">
                  {/* Conector */}
                  {i > 0 && (
                    <div className="flex flex-col items-center gap-1.5 px-1 min-w-[64px]">
                      <span
                        className={cn(
                          "font-mono-luxe text-[11px] font-bold tabular-nums",
                          isBottleneck
                            ? "text-rose-500 dark:text-rose-400"
                            : "text-emerald-500 dark:text-emerald-400"
                        )}
                      >
                        {t!.conv.toFixed(0)}%
                      </span>
                      <div className="relative w-full h-px bg-border">
                        <div
                          className={cn(
                            "absolute inset-y-0 left-0 h-px",
                            isBottleneck
                              ? "bg-gradient-to-r from-rose-500/80 to-rose-500/0 shadow-[0_0_8px_0_rgba(244,63,94,0.6)]"
                              : "bg-gradient-to-r from-emerald-500/80 to-emerald-500/0 shadow-[0_0_8px_0_rgba(16,185,129,0.5)]"
                          )}
                          style={{ width: `${Math.min(t!.conv, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Estação */}
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border transition-all",
                        "bg-muted/40 border-border",
                        i === stages.length - 1 && s.count > 0 &&
                          "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_22px_-4px_rgba(16,185,129,0.5)]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          i === stages.length - 1 && s.count > 0
                            ? "text-emerald-500 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                        strokeWidth={1.75}
                      />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                      {s.label}
                    </p>
                    <p className="font-mono-luxe text-2xl font-bold tabular-nums tracking-tighter text-foreground leading-none">
                      {s.count}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {bottleneck && bottleneck.loss >= 20 && (
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
              <div className="h-7 w-7 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle
                  className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400"
                  strokeWidth={2}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-rose-500 dark:text-rose-400 font-bold mb-0.5">
                  Atenção
                </p>
                <p className="text-[12px] text-foreground/90 font-medium leading-snug">
                  Perda de{" "}
                  <span className="font-mono-luxe font-bold text-rose-500 dark:text-rose-400">
                    {bottleneck.loss.toFixed(0)}%
                  </span>{" "}
                  na etapa{" "}
                  <span className="font-semibold">
                    {bottleneck.from} → {bottleneck.to}
                  </span>
                  . Atenção necessária.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
