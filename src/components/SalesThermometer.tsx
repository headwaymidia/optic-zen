import { Fragment, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { AlertTriangle, TrendingDown, Thermometer, CheckCircle2 } from "lucide-react";

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
        textAccent: "text-blue-600",
        bg: "bg-blue-50",
        ring: "ring-blue-200",
      },
      {
        key: "agendou",
        label: "Agendaram Exame",
        shortLabel: "Agendamento",
        count: agendou,
        conv: total > 0 ? agendou / total : null,
        accent: "bg-purple-500",
        textAccent: "text-purple-600",
        bg: "bg-purple-50",
        ring: "ring-purple-200",
      },
      {
        key: "compareceu",
        label: "Compareceram",
        shortLabel: "Comparecimento",
        count: compareceu,
        conv: agendou > 0 ? compareceu / agendou : null,
        accent: "bg-cyan-500",
        textAccent: "text-cyan-600",
        bg: "bg-cyan-50",
        ring: "ring-cyan-200",
      },
      {
        key: "comprou",
        label: "Compraram",
        shortLabel: "Venda",
        count: comprou,
        conv: compareceu > 0 ? comprou / compareceu : null,
        accent: "bg-emerald-500",
        textAccent: "text-emerald-600",
        bg: "bg-emerald-50",
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-rose-500" />
            <CardTitle className="text-base">Termômetro de Vendas</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Conversão geral</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full font-bold tabular-nums",
                overallConv >= 10
                  ? "bg-emerald-100 text-emerald-700"
                  : overallConv >= 5
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
              )}
            >
              {overallConv.toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Onde o lead esfria? Veja o gargalo entre cada etapa do funil.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Funil visual */}
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-stretch">
          {stages.map((s, i) => {
            const widthPct = totalLeads > 0 ? Math.max(15, (s.count / totalLeads) * 100) : 15;
            const isBottleneckTarget = bottleneck?.stage.key === s.key;

            return (
              <Fragment key={s.key}>
                <div
                  className={cn(
                    "sm:col-span-1 relative rounded-xl border p-3 transition-all",
                    s.bg,
                    isBottleneckTarget
                      ? "border-rose-400 ring-2 ring-rose-200 shadow-sm"
                      : "border-slate-100"
                  )}
                >
                  {isBottleneckTarget && (
                    <span
                      className="absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm"
                      title="Maior queda de conversão"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Gargalo
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", s.accent)} />
                    <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold truncate">
                      {s.shortLabel}
                    </span>
                  </div>
                  <p className={cn("text-2xl font-bold tabular-nums mt-1", s.textAccent)}>{s.count}</p>
                  <p className="text-[11px] text-slate-600 truncate">{s.label}</p>

                  {/* Barra proporcional ao volume */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/70 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", s.accent)}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>

                {/* Conector com taxa de conversão */}
                {i < stages.length - 1 && (
                  <div
                    className="sm:col-span-1 flex sm:flex-col items-center justify-center gap-1 py-1 sm:py-0"
                  >
                    {(() => {
                      const next = stages[i + 1];
                      const conv = next.conv;
                      const isBottleneck = bottleneck?.stage.key === next.key;
                      const pctNum = conv === null ? 0 : conv * 100;
                      const tone =
                        conv === null
                          ? "text-slate-400 bg-slate-100"
                          : isBottleneck
                            ? "text-rose-700 bg-rose-100"
                            : pctNum >= 60
                              ? "text-emerald-700 bg-emerald-100"
                              : pctNum >= 30
                                ? "text-amber-700 bg-amber-100"
                                : "text-rose-700 bg-rose-100";
                      return (
                        <>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                              tone
                            )}
                          >
                            {isBottleneck && <TrendingDown className="h-3 w-3" />}
                            {formatPct(conv)}
                          </span>
                          <span className="hidden sm:block text-[9px] text-slate-400 uppercase tracking-wide">
                            convertem
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            );
          })}
        </div>

        {/* Diagnóstico do gargalo */}
        <div
          className={cn(
            "rounded-lg border p-3 flex items-start gap-3",
            bottleneck
              ? "border-rose-200 bg-rose-50"
              : "border-emerald-200 bg-emerald-50"
          )}
        >
          {bottleneck ? (
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs sm:text-sm">
            {bottleneck ? (
              <>
                <p className="font-semibold text-rose-900">
                  Gargalo identificado: {bottleneck.prev!.shortLabel} → {bottleneck.stage.shortLabel}
                </p>
                <p className="text-rose-800 mt-0.5">
                  Apenas <strong>{formatPct(bottleneck.stage.conv)}</strong> dos leads que chegaram em{" "}
                  <strong>{bottleneck.prev!.shortLabel}</strong> avançaram para{" "}
                  <strong>{bottleneck.stage.shortLabel}</strong>. Foque o time aqui — não é problema
                  de captação.
                </p>
              </>
            ) : (
              <p className="font-semibold text-emerald-900">
                Funil saudável: todas as etapas convertem bem. Continue assim!
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
