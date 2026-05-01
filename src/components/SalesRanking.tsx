import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { Trophy } from "lucide-react";

interface RankItem {
  name: string;
  revenue: number;
  count: number;
}

const POSITION_LABEL = ["1º", "2º", "3º"];

const POSITION_STYLE = [
  "bg-amber-400/15 text-amber-600 dark:text-amber-300 border-amber-400/30",
  "bg-zinc-300/20 text-zinc-600 dark:text-zinc-300 border-zinc-400/30",
  "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/25",
];

const BAR_STYLE = [
  "bg-gradient-to-r from-amber-400 to-amber-500",
  "bg-gradient-to-r from-zinc-400 to-zinc-500",
  "bg-gradient-to-r from-orange-400 to-orange-500",
];

export function SalesRanking({ leads }: { leads: Lead[] }) {
  const ranking = useMemo<RankItem[]>(() => {
    const counts = new Map<string, { count: number; revenue: number }>();
    leads
      .filter((l) => l.status === "Compareceu e Comprou" && l.assigned_to)
      .forEach((l) => {
        const key = l.assigned_to as string;
        const cur = counts.get(key) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += Number(l.sale_value ?? 0);
        counts.set(key, cur);
      });
    return Array.from(counts.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
      .slice(0, 3);
  }, [leads]);

  const max = ranking[0]?.revenue || 1;

  return (
    <Card
      className="rounded-2xl p-7 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#222222] shadow-sm h-full flex flex-col"
      style={{ fontFamily: "'Inter','Geist Sans',sans-serif" }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-3.5 w-3.5 text-amber-500" strokeWidth={2} />
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
          Ranking de Vendas · Top 3
        </p>
      </div>

      <ol className="flex-1 flex flex-col justify-center space-y-7">
        {ranking.map((r, i) => {
          const pct = Math.max(8, (r.revenue / max) * 100);
          return (
            <li key={r.name} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold border ${POSITION_STYLE[i]}`}
                  >
                    {i === 0 ? (
                      <Trophy className="h-3.5 w-3.5" strokeWidth={2.2} />
                    ) : (
                      POSITION_LABEL[i]
                    )}
                  </span>
                  <span className="text-[14px] font-medium text-[#1D1D1F] dark:text-white truncate">
                    {r.name}
                  </span>
                </div>
                <span className="text-[15px] font-semibold tabular-nums tracking-tight text-[#1D1D1F] dark:text-white shrink-0">
                  {r.revenue.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="h-[3px] w-full rounded-full bg-slate-100 dark:bg-[#1c1c1c] overflow-hidden">
                <div
                  className={`h-full rounded-full ${BAR_STYLE[i]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                {r.count} venda{r.count > 1 ? "s" : ""} concluída
                {r.count > 1 ? "s" : ""}
              </p>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
