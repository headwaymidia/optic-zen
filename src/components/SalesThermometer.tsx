import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Sparkles, CalendarCheck, UserCheck, Trophy } from "lucide-react";

interface SalesThermometerProps {
  leads: Lead[];
}

type Stage = {
  key: string;
  label: string;
  count: number;
  conv: number | null;
};

/**
 * Funil minimalista: barra de progresso horizontal + 4 indicadores de texto.
 * Estilo Linear/Vercel — sem círculos, sem cores fortes.
 */
export function SalesThermometer({ leads }: SalesThermometerProps) {
  const stages = useMemo<Stage[]>(() => {
    const total = leads.length;
    const agendou = leads.filter((l) =>
      ["Agendou Exame", "Não Compareceu", "Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const compareceu = leads.filter((l) =>
      ["Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const comprou = leads.filter((l) => l.status === "Compareceu e Comprou").length;

    return [
      { key: "captacao",   label: "Captação",       count: total,      conv: null },
      { key: "agendou",    label: "Agendamento",    count: agendou,    conv: total > 0 ? agendou / total : null },
      { key: "compareceu", label: "Comparecimento", count: compareceu, conv: agendou > 0 ? compareceu / agendou : null },
      { key: "comprou",    label: "Venda",          count: comprou,    conv: compareceu > 0 ? comprou / compareceu : null },
    ];
  }, [leads]);

  const totalLeads = stages[0].count;
  const finalSales = stages[stages.length - 1].count;
  const overallConv = totalLeads > 0 ? (finalSales / totalLeads) * 100 : 0;

  const formatPct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);

  if (totalLeads === 0) {
    return (
      <Card className="glass-card rounded-lg border-0">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground">
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <p className="text-xs text-muted-foreground py-2 font-light">Sem leads no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card rounded-lg border-0">
      <CardHeader className="pb-3 pt-5 px-6 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground">
          Funil de Conversão
        </CardTitle>
        <span className="text-[11px] tabular-nums text-foreground font-medium">
          {overallConv.toFixed(1)}%
          <span className="ml-2 text-muted-foreground font-light uppercase tracking-[0.2em] text-[9px]">
            conversão total
          </span>
        </span>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-2 space-y-6">
        {/* Trilha ultra-fina (2px) com gradiente neon esmeralda → ciano */}
        <div className="relative h-[2px] w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all shadow-[0_0_10px_rgba(16,185,129,0.45)]"
            style={{ width: `${overallConv}%` }}
          />
        </div>

        {/* Indicadores — 4 colunas com gap maior */}
        <div className="grid grid-cols-4 gap-6 pt-1">
          {stages.map((s, i) => {
            const isLast = i === stages.length - 1;
            const Icon = s.Icon;
            return (
              <div key={s.key} className="flex flex-col gap-2.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn("h-3.5 w-3.5 shrink-0", isLast ? "text-emerald-400" : "text-zinc-500")}
                    strokeWidth={1.5}
                  />
                  <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold truncate">
                    {s.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-mono-luxe text-xl font-bold tabular-nums tracking-tighter leading-none",
                      isLast ? "text-emerald-400" : "text-foreground"
                    )}
                  >
                    {s.count}
                  </span>
                  {i > 0 && (
                    <span className="font-mono-luxe text-[11px] tabular-nums text-zinc-500 font-medium">
                      {formatPct(s.conv)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
