import { Fragment, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { AlertTriangle, TrendingDown, Thermometer, CheckCircle2, ChevronRight } from "lucide-react";

interface SalesThermometerProps {
  leads: Lead[];
}

type Stage = {
  key: string;
  label: string;
  shortLabel: string;
  count: number;
  // Taxa de conversão a partir da etapa anterior (0..1) ou null para a primeira
  conv: number | null;
  // Cor de acento (em HSL via classes utilitárias)
  accent: string;
  textAccent: string;
  bg: string;
  ring: string;
};

/**
 * Termômetro de Vendas
 * Funil: Captação → Agendou Exame → Compareceu → Comprou
 * - "Compareceu" = comparecidos no exame = "Compareceu e Comprou" + "Compareceu e Não Comprou"
 * - "Comprou" = "Compareceu e Comprou"
 * Detecta o gargalo (menor taxa de conversão entre etapas) e destaca visualmente.
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
      {
        key: "captacao",
        label: "Leads Captados",
        shortLabel: "Captação",
        count: total,
        conv: null,
        accent: "bg-blue-500",
        textAccent: "text-blue-600 dark:text-blue-300",
        bg: "bg-blue-50 dark:bg-blue-500/10",
        ring: "ring-blue-200",
      },
      {
        key: "agendou",
        label: "Agendaram Exame",
        shortLabel: "Agendamento",
        count: agendou,
        conv: total > 0 ? agendou / total : null,
        accent: "bg-purple-500",
        textAccent: "text-purple-600 dark:text-purple-300",
        bg: "bg-purple-50 dark:bg-purple-500/10",
        ring: "ring-purple-200",
      },
      {
        key: "compareceu",
        label: "Compareceram",
        shortLabel: "Comparecimento",
        count: compareceu,
        conv: agendou > 0 ? compareceu / agendou : null,
        accent: "bg-cyan-500",
        textAccent: "text-cyan-600 dark:text-cyan-300",
        bg: "bg-cyan-50 dark:bg-cyan-500/10",
        ring: "ring-cyan-200",
      },
      {
        key: "comprou",
        label: "Compraram",
        shortLabel: "Venda",
        count: comprou,
        conv: compareceu > 0 ? comprou / compareceu : null,
        accent: "bg-emerald-500",
        textAccent: "text-emerald-600 dark:text-emerald-300",
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        ring: "ring-emerald-200",
      },
    ];
  }, [leads]);

  const totalLeads = stages[0].count;
  const finalSales = stages[stages.length - 1].count;
  const overallConv = totalLeads > 0 ? (finalSales / totalLeads) * 100 : 0;

  // Identifica o gargalo: menor taxa de conversão entre etapas (ignora a primeira/null)
  const bottleneck = useMemo(() => {
    const candidates = stages
      .map((s, i) => ({ stage: s, prev: stages[i - 1], idx: i }))
      .filter((x) => x.stage.conv !== null && x.prev && x.prev.count > 0);
    if (candidates.length === 0) return null;
    let worst = candidates[0];
    for (const c of candidates) {
      if ((c.stage.conv ?? 1) < (worst.stage.conv ?? 1)) worst = c;
    }
    return worst;
  }, [stages]);

  const formatPct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);

  if (totalLeads === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-rose-500" />
            <CardTitle className="text-base">Termômetro de Vendas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem leads no período. Quando houver captação, o funil aparece aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Thermometer className="h-3.5 w-3.5 text-rose-500" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Termômetro de Vendas</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground">Conversão geral</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full font-semibold tabular-nums text-white text-[11px]",
                overallConv >= 10
                  ? "bg-emerald-500"
                  : overallConv >= 5
                    ? "bg-amber-500"
                    : "bg-rose-500"
              )}
            >
              {overallConv.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-3">
        {/* Funil em formato de progress bar segmentada */}
        <div className="space-y-1.5">
          {stages.map((s, i) => {
            const widthPct = totalLeads > 0 ? Math.max(4, (s.count / totalLeads) * 100) : 4;
            const isBottleneckTarget = bottleneck?.stage.key === s.key;
            const conv = s.conv;
            const pctNum = conv === null ? 0 : conv * 100;
            const isHot = pctNum >= 60 && !isBottleneckTarget;

            return (
              <div key={s.key} className="grid grid-cols-12 items-center gap-2">
                {/* Label */}
                <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5 min-w-0">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.accent)} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
                    {s.shortLabel}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="col-span-6 sm:col-span-7">
                  <div className="relative h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", s.accent)}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>

                {/* Contagem + conversão */}
                <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-2">
                  <span className={cn("text-sm font-black tabular-nums tracking-tight", s.textAccent)}>
                    {s.count}
                  </span>
                  {conv !== null && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[42px] rounded-full border px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        isBottleneckTarget
                          ? "text-amber-700 dark:text-amber-300 bg-card border-amber-300 dark:border-amber-500/40"
                          : isHot
                            ? "text-emerald-700 dark:text-emerald-300 bg-card border-emerald-300 dark:border-emerald-500/40 shadow-[0_0_10px_-2px_hsl(160_84%_50%/0.7)] dark:shadow-[0_0_14px_-2px_hsl(160_84%_55%/0.85)]"
                            : "text-muted-foreground bg-card border-border"
                      )}
                    >
                      {isBottleneckTarget && <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
                      {formatPct(conv)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Diagnóstico discreto no rodapé */}
        {bottleneck ? (
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <span className="font-medium text-foreground">Ponto de atenção:</span>{" "}
              {bottleneck.prev!.shortLabel} → {bottleneck.stage.shortLabel} converte apenas{" "}
              <span className="font-semibold tabular-nums">{formatPct(bottleneck.stage.conv)}</span>.
              Vale revisar essa etapa com o time.
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            Funil saudável: todas as etapas convertem bem.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
