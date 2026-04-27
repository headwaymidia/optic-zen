import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { TrendingDown } from "lucide-react";

interface Props {
  leads: Lead[];
}

const LOSS_REASONS = [
  { key: "preco", label: "Preço", match: ["preç", "caro", "valor"] },
  { key: "distancia", label: "Distância", match: ["dist", "long", "endere"] },
  { key: "tempo", label: "Falta de Tempo", match: ["tempo", "ocupad", "agora não", "depois"] },
  { key: "semresposta", label: "Sem Resposta", match: ["sem resp", "não resp", "nao resp", "silenc"] },
  { key: "concorrente", label: "Concorrente", match: ["concorr", "outra", "outro lugar"] },
  { key: "outros", label: "Outros", match: [] as string[] },
];

function classifyLoss(notes: string | null): string {
  if (!notes) return "outros";
  const n = notes.toLowerCase();
  for (const r of LOSS_REASONS) {
    if (r.match.length && r.match.some((m) => n.includes(m))) return r.key;
  }
  return "outros";
}

/**
 * Tags de Inteligência — substitui o gráfico de rosca.
 * Pílulas ranqueadas com barras horizontais minimalistas preenchendo o fundo.
 */
export function LossIntelligenceTags({ leads }: Props) {
  const items = useMemo(() => {
    const lost = leads.filter((l) => l.status === "Compareceu e Não Comprou");
    const counts: Record<string, number> = {};
    LOSS_REASONS.forEach((r) => (counts[r.key] = 0));
    lost.forEach((l) => {
      counts[classifyLoss(l.notes)] += 1;
    });
    const total = lost.length;
    return LOSS_REASONS.map((r) => ({
      key: r.key,
      label: r.label,
      count: counts[r.key],
      pct: total > 0 ? (counts[r.key] / total) * 100 : 0,
    }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalLost = items.reduce((s, d) => s + d.count, 0);
  const max = items[0]?.count ?? 1;

  return (
    <Card className="glass-card rounded-2xl border-0 p-7">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1.5">
            Inteligência de Perda
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
            Ranking por motivo
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono-luxe text-xl font-bold tabular-nums tracking-tighter text-foreground leading-none">
            {totalLost}
          </p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-semibold mt-1.5">
            Perdas
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground font-light py-6 text-center">
          Sem dados de perda no período.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const fillPct = (item.count / max) * 100;
            const isTop = idx === 0;
            return (
              <div
                key={item.key}
                className="relative overflow-hidden rounded-lg border border-white/5 dark:border-white/5 border-black/5 bg-zinc-950/30 dark:bg-zinc-950/30 bg-zinc-50"
              >
                {/* Barra horizontal preenchendo o fundo */}
                <div
                  className={
                    isTop
                      ? "absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500/15 to-transparent transition-all"
                      : "absolute inset-y-0 left-0 bg-gradient-to-r from-zinc-500/10 to-transparent transition-all"
                  }
                  style={{ width: `${fillPct}%` }}
                  aria-hidden
                />
                {/* Conteúdo da pílula */}
                <div className="relative flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={
                        isTop
                          ? "font-mono-luxe text-[10px] font-bold tabular-nums text-rose-400"
                          : "font-mono-luxe text-[10px] font-bold tabular-nums text-zinc-500"
                      }
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-[12px] font-medium text-foreground truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="font-mono-luxe text-sm font-bold tabular-nums text-foreground">
                      {item.count}
                    </span>
                    <span className="font-mono-luxe text-[10px] tabular-nums text-zinc-500 font-semibold">
                      {item.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer insight */}
          {items[0] && (
            <div className="flex items-center gap-2 pt-3 mt-1 border-t border-white/5 dark:border-white/5 border-black/5">
              <TrendingDown className="h-3 w-3 text-rose-400/70" strokeWidth={2} />
              <p className="text-[10px] text-zinc-500 font-medium">
                Maior gargalo:{" "}
                <span className="text-foreground font-semibold">{items[0].label}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
