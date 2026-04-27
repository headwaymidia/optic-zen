import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

const RANK_STYLES = [
  "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100", // 1st
  "bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-100", // 2nd
  "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100", // 3rd
];

export function SalesRanking({ leads }: { leads: Lead[] }) {
  const ranking = useMemo(() => {
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
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  }, [leads]);

  const max = ranking[0]?.count ?? 1;

  return (
    <Card className="border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          Ranking de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma venda atribuída a vendedoras ainda.
          </p>
        ) : (
          <ol className="space-y-3">
            {ranking.map((r, i) => {
              const pct = (r.count / max) * 100;
              return (
                <li key={r.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          RANK_STYLES[i] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {i < 3 ? <Medal className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className="font-medium truncate">{r.name}</span>
                    </span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      {r.count} venda{r.count > 1 ? "s" : ""}
                      {r.revenue > 0 && (
                        <>
                          {" · "}
                          {r.revenue.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            maximumFractionDigits: 0,
                          })}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
