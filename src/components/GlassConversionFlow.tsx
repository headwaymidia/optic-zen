import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles, CalendarCheck, UserCheck, Trophy, ChevronRight } from "lucide-react";

interface Props {
  leads: Lead[];
}

/**
 * Funil horizontal de "estações" estilo cockpit de vidro.
 * 4 estações conectadas por linha de progresso com taxa de conversão entre cada par.
 */
export function GlassConversionFlow({ leads }: Props) {
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
      { key: "leads", label: "Leads", count: total, Icon: Sparkles },
      { key: "agend", label: "Agendados", count: agendou, Icon: CalendarCheck },
      { key: "compar", label: "Compareceram", count: compareceu, Icon: UserCheck },
      { key: "compr", label: "Compraram", count: comprou, Icon: Trophy },
    ];
  }, [leads]);

  const totalLeads = stages[0].count;
  const finalSales = stages[stages.length - 1].count;
  const overallConv = totalLeads > 0 ? (finalSales / totalLeads) * 100 : 0;

  return (
    <Card className="glass-card rounded-xl border-0 p-7">
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1.5">
            Funil de Conversão
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
            Fluxo end-to-end · Leads → Compraram
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono-luxe text-2xl font-bold tabular-nums tracking-tighter text-emerald-400 leading-none">
            {overallConv.toFixed(1)}%
          </p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-semibold mt-1.5">
            Conversão Total
          </p>
        </div>
      </div>

      {totalLeads === 0 ? (
        <p className="text-xs text-muted-foreground font-light py-6 text-center">
          Sem leads no período.
        </p>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-3">
          {stages.map((s, i) => {
            const Icon = s.Icon;
            const isLast = i === stages.length - 1;
            const isHot = isLast && s.count > 0;
            const prev = i > 0 ? stages[i - 1].count : null;
            const stepConv = prev && prev > 0 ? (s.count / prev) * 100 : null;

            return (
              <div key={s.key} className="contents">
                {/* ESTAÇÃO */}
                <div
                  className={cn(
                    "rounded-xl p-4 backdrop-blur-md border transition-all relative overflow-hidden",
                    "bg-zinc-900/40 border-white/5",
                    isHot &&
                      "border-emerald-400/30 shadow-[0_0_22px_-4px_rgba(16,185,129,0.40),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                  )}
                >
                  {/* glow superior se hot */}
                  {isHot && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.10) 0%, transparent 70%)",
                      }}
                      aria-hidden
                    />
                  )}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5",
                          isHot ? "text-emerald-400" : "text-zinc-500"
                        )}
                        strokeWidth={1.5}
                      />
                      <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold truncate">
                        {s.label}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "font-mono-luxe text-3xl font-bold tabular-nums tracking-tighter leading-none",
                        isHot ? "text-emerald-400" : "text-foreground"
                      )}
                    >
                      {s.count}
                    </p>
                  </div>
                </div>

                {/* CONECTOR — linha + taxa entre etapas */}
                {i < stages.length - 1 && (
                  <div className="flex flex-col items-center gap-1.5 px-1">
                    <span className="font-mono-luxe text-[10px] tabular-nums text-zinc-500 font-bold">
                      {stepConv !== null ? `${stepConv.toFixed(0)}%` : "—"}
                    </span>
                    <div className="relative w-full min-w-[36px] h-px bg-white/5">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/60 to-emerald-500/0"
                        style={{ width: `${Math.min(stepConv ?? 0, 100)}%` }}
                      />
                    </div>
                    <ChevronRight className="h-3 w-3 text-zinc-600" strokeWidth={2} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
