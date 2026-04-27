import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { AlertTriangle, Thermometer, CheckCircle2 } from "lucide-react";

interface SalesThermometerProps {
  leads: Lead[];
}

type Stage = {
  key: string;
  label: string;
  shortLabel: string;
  count: number;
  conv: number | null; // taxa a partir da etapa anterior
  dot: string;         // cor do círculo
  text: string;        // cor do número
};

/**
 * Funil em formato de "Stepper Horizontal":
 * Captação ─68%→ Agendamento ─82%→ Comparecimento ─44%→ Venda
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
      { key: "captacao",   label: "Leads captados",   shortLabel: "Captação",       count: total,      conv: null,
        dot: "bg-blue-500",    text: "text-blue-600 dark:text-blue-300" },
      { key: "agendou",    label: "Agendaram exame",  shortLabel: "Agendamento",    count: agendou,    conv: total > 0 ? agendou / total : null,
        dot: "bg-violet-500",  text: "text-violet-600 dark:text-violet-300" },
      { key: "compareceu", label: "Compareceram",     shortLabel: "Comparecimento", count: compareceu, conv: agendou > 0 ? compareceu / agendou : null,
        dot: "bg-cyan-500",    text: "text-cyan-600 dark:text-cyan-300" },
      { key: "comprou",    label: "Compraram",        shortLabel: "Venda",          count: comprou,    conv: compareceu > 0 ? comprou / compareceu : null,
        dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-300" },
    ];
  }, [leads]);

  const totalLeads = stages[0].count;
  const finalSales = stages[stages.length - 1].count;
  const overallConv = totalLeads > 0 ? (finalSales / totalLeads) * 100 : 0;

  // Gargalo: menor conv > 0
  const bottleneck = useMemo(() => {
    const candidates = stages
      .map((s, i) => ({ stage: s, prev: stages[i - 1], idx: i }))
      .filter((x) => x.stage.conv !== null && x.prev && x.prev.count > 0);
    if (!candidates.length) return null;
    return candidates.reduce((w, c) => ((c.stage.conv ?? 1) < (w.stage.conv ?? 1) ? c : w), candidates[0]);
  }, [stages]);

  const formatPct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);

  if (totalLeads === 0) {
    return (
      <Card className="border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-2">
            <Thermometer className="h-3.5 w-3.5 text-rose-500" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Funil de Conversão</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sem leads no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Thermometer className="h-3.5 w-3.5 text-rose-500" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Funil de Conversão</CardTitle>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full font-bold tabular-nums text-white text-[11px]",
              overallConv >= 10 ? "bg-emerald-500" : overallConv >= 5 ? "bg-amber-500" : "bg-rose-500"
            )}
          >
            {overallConv.toFixed(1)}%
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-1">
        {/* Stepper horizontal */}
        <div className="flex items-start justify-between gap-1 relative">
          {stages.map((s, i) => {
            const next = stages[i + 1];
            const showConn = i < stages.length - 1;
            const isBottleneckTarget = bottleneck?.stage.key === next?.key;

            return (
              <div key={s.key} className="flex-1 flex items-start min-w-0">
                {/* Step */}
                <div className="flex flex-col items-center min-w-0 flex-shrink-0 w-16">
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold tabular-nums",
                      s.dot
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className={cn("text-base font-bold tabular-nums tracking-tight mt-1.5 leading-none", s.text)}>
                    {s.count}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1 text-center leading-tight">
                    {s.shortLabel}
                  </div>
                </div>

                {/* Connector com taxa de conversão */}
                {showConn && (
                  <div className="flex-1 flex flex-col items-center justify-start pt-1 min-w-0 px-1">
                    <span
                      className={cn(
                        "text-[10px] font-bold tabular-nums leading-none",
                        isBottleneckTarget ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                      )}
                    >
                      {formatPct(next!.conv)}
                    </span>
                    <div
                      className={cn(
                        "mt-1.5 h-px w-full relative",
                        isBottleneckTarget
                          ? "bg-amber-300 dark:bg-amber-500/40"
                          : "bg-border"
                      )}
                    >
                      <span className="absolute -right-0.5 -top-1 text-muted-foreground text-[10px] leading-none">›</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Diagnóstico discreto */}
        {bottleneck ? (
          <p className="text-[11px] text-muted-foreground pt-3 mt-3 border-t border-border flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <span className="font-medium text-foreground">Ponto de atenção:</span>{" "}
              {bottleneck.prev!.shortLabel} → {bottleneck.stage.shortLabel} converte apenas{" "}
              <span className="font-bold tabular-nums">{formatPct(bottleneck.stage.conv)}</span>.
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground pt-3 mt-3 border-t border-border flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            Funil saudável: todas as etapas convertem bem.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
