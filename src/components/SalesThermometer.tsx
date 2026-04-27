import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
      <Card className="border border-border bg-card rounded-lg">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-xs text-muted-foreground py-2">Sem leads no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card rounded-lg">
      <CardHeader className="pb-3 pt-4 px-5 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Funil de Conversão
        </CardTitle>
        <span className="text-[11px] tabular-nums text-foreground font-medium">
          {overallConv.toFixed(1)}% conversão total
        </span>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-1 space-y-3">
        {/* Barra de progresso segmentada minimalista */}
        <div className="flex items-center gap-1 h-1">
          {stages.map((s, i) => {
            const widthPct = totalLeads > 0 ? (s.count / totalLeads) * 100 : 0;
            const isLast = i === stages.length - 1;
            return (
              <div
                key={s.key}
                className={cn(
                  "h-full rounded-full transition-all",
                  isLast ? "bg-emerald-500" : "bg-foreground"
                )}
                style={{ width: `${Math.max(widthPct, 4)}%`, opacity: 1 - i * 0.18 }}
              />
            );
          })}
          <div className="flex-1 h-full rounded-full bg-border" />
        </div>

        {/* Indicadores de texto — 4 colunas */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {stages.map((s, i) => (
            <div key={s.key} className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {s.label}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-medium tabular-nums text-foreground leading-none">
                  {s.count}
                </span>
                {i > 0 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {formatPct(s.conv)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
