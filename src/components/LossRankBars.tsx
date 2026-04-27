import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";

interface Props {
  leads: Lead[];
}

const LOSS_REASONS = [
  { key: "preco", label: "Preço", match: ["preç", "caro", "valor"] },
  { key: "naogostou", label: "Não gostou", match: ["não gost", "nao gost", "feio"] },
  { key: "distancia", label: "Distância", match: ["dist", "long", "endere"] },
  { key: "tempo", label: "Falta de Tempo", match: ["tempo", "ocupad", "depois"] },
  { key: "semresposta", label: "Sem Resposta", match: ["sem resp", "não resp", "nao resp", "silenc"] },
  { key: "concorrente", label: "Concorrente", match: ["concorr", "outro lugar", "outra"] },
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
 * Ranking horizontal de Motivos de Perda — substitui o donut chart.
 * Top list estilo Stripe Sigma.
 */
export function LossRankBars({ leads }: Props) {
  const items = useMemo(() => {
    const lost = leads.filter((l) => l.status === "Compareceu e Não Comprou");
    const counts: Record<string, number> = {};
    LOSS_REASONS.forEach((r) => (counts[r.key] = 0));
    lost.forEach((l) => (counts[classifyLoss(l.notes)] += 1));
    const total = lost.length;
    return LOSS_REASONS.map((r) => ({
      label: r.label,
      count: counts[r.key],
      pct: total > 0 ? (counts[r.key] / total) * 100 : 0,
    }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const max = items[0]?.count ?? 1;
  const total = items.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="glass-card rounded-2xl p-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold mb-1.5">
            Motivos de Perda
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
            Ranking · onde o dinheiro está fugindo
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono-luxe text-xl font-bold tabular-nums tracking-tighter text-foreground leading-none">
            {total}
          </p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/70 font-semibold mt-1.5">
            Perdas
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Sem dados de perda no período.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => {
            const w = (it.count / max) * 100;
            return (
              <div key={it.label} className="group">
                <div className="flex items-baseline justify-between mb-1.5 text-[12px]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-luxe text-[10px] font-bold tabular-nums text-muted-foreground/80 w-4">
                      {idx + 1}
                    </span>
                    <span className="text-foreground font-medium">{it.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-luxe font-bold tabular-nums text-foreground">
                      {it.count}
                    </span>
                    <span className="font-mono-luxe text-[10px] tabular-nums text-muted-foreground/70">
                      {it.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={
                      idx === 0
                        ? "h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all"
                        : "h-full rounded-full bg-gradient-to-r from-zinc-400 to-zinc-300 dark:from-zinc-500 dark:to-zinc-600 transition-all"
                    }
                    style={{ width: `${w}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
