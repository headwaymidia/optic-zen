import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { AlertTriangle } from "lucide-react";

interface Props {
  leads: Lead[];
}

/**
 * Funil VERTICAL Gamificado — Pirâmide Invertida (Dashpro).
 * Blocos empilhados centralizados, larguras decrescentes, gradiente amarelo neon.
 * Número absoluto DENTRO do bloco. Taxa de conversão (%) FLUTUANDO ao lado.
 */
export function VerticalNeonFunnel({ leads }: Props) {
  const stages = useMemo(() => {
    const total = leads.length;
    const ag = leads.filter((l) =>
      ["Agendou Exame", "Não Compareceu", "Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const at = leads.filter((l) =>
      ["Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const vd = leads.filter((l) => l.status === "Compareceu e Comprou").length;

    return [
      { key: "leads", label: "Leads", count: total, w: "w-full", isWin: false },
      { key: "ag", label: "Agendamento", count: ag, w: "w-4/5", isWin: false },
      { key: "at", label: "Compareceram", count: at, w: "w-3/5", isWin: false },
      { key: "vd", label: "Vendas", count: vd, w: "w-1/2", isWin: true },
    ];
  }, [leads]);

  const transitions = stages.slice(1).map((s, i) => {
    const prev = stages[i].count;
    const conv = prev > 0 ? (s.count / prev) * 100 : 0;
    return { conv, loss: 100 - conv };
  });

  let bottleneckIdx = -1;
  let worstLoss = -1;
  transitions.forEach((t, i) => {
    if (stages[i].count > 0 && t.loss > worstLoss) {
      worstLoss = t.loss;
      bottleneckIdx = i;
    }
  });

  const overall =
    stages[0].count > 0 ? (stages[stages.length - 1].count / stages[0].count) * 100 : 0;

  return (
    <Card className="glass-card rounded-2xl p-7">
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1.5">
            Funil de Conversão
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
            Pirâmide invertida · Leads → Vendas
          </p>
        </div>
        <div className="text-right">
          <p
            className="font-mono-luxe text-2xl font-bold tabular-nums tracking-tighter leading-none neon-glow-green"
            style={{ color: "#22C55E" }}
          >
            {overall.toFixed(1)}%
          </p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-semibold mt-1.5">
            Conversão Total
          </p>
        </div>
      </div>

      {stages[0].count === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Sem leads no período.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          {stages.map((s, i) => {
            const t = i > 0 ? transitions[i - 1] : null;
            const isBottleneck = i > 0 && i - 1 === bottleneckIdx;
            const fillStyle = s.isWin
              ? {
                  background:
                    "linear-gradient(90deg, #16A34A 0%, #22C55E 50%, #4ADE80 100%)",
                  boxShadow:
                    "0 0 0 1px rgba(34,197,94,0.40), 0 0 32px -4px rgba(34,197,94,0.55), inset 0 1px 0 0 rgba(255,255,255,0.25)",
                }
              : {
                  background:
                    "linear-gradient(90deg, #CA8A04 0%, #FACC15 50%, #FDE047 100%)",
                  boxShadow:
                    "0 0 0 1px rgba(250,204,21,0.40), 0 0 28px -4px rgba(250,204,21,0.50), inset 0 1px 0 0 rgba(255,255,255,0.25)",
                };

            return (
              <div key={s.key} className="w-full flex items-center gap-4">
                {/* Bloco do funil */}
                <div className={`${s.w} mx-auto relative`}>
                  <div
                    className="rounded-xl px-6 py-5 flex items-center justify-between"
                    style={fillStyle}
                  >
                    <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-black/80">
                      {s.label}
                    </span>
                    <span className="font-mono-luxe text-3xl sm:text-4xl font-bold tabular-nums tracking-tighter text-black leading-none">
                      {s.count}
                    </span>
                  </div>

                  {/* Taxa flutuando ao lado direito */}
                  {t && (
                    <div className="absolute top-1/2 -right-2 translate-x-full -translate-y-1/2 flex items-center gap-1.5 whitespace-nowrap pl-3">
                      <span
                        className={`font-mono-luxe text-[13px] font-bold tabular-nums ${
                          isBottleneck
                            ? "text-rose-400"
                            : "text-[#FACC15] neon-glow-yellow"
                        }`}
                      >
                        {t.conv.toFixed(0)}%
                      </span>
                      {isBottleneck && (
                        <AlertTriangle
                          className="h-3 w-3 text-rose-400"
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {bottleneckIdx >= 0 && transitions[bottleneckIdx].loss >= 20 && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3">
          <AlertTriangle
            className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5"
            strokeWidth={2}
          />
          <p className="text-[12px] text-zinc-300 font-medium leading-snug">
            Perda de{" "}
            <span className="font-mono-luxe font-bold text-rose-400">
              {transitions[bottleneckIdx].loss.toFixed(0)}%
            </span>{" "}
            entre{" "}
            <span className="font-semibold text-foreground">
              {stages[bottleneckIdx].label} → {stages[bottleneckIdx + 1].label}
            </span>
            . Atenção necessária.
          </p>
        </div>
      )}
    </Card>
  );
}
