import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles, CalendarCheck, UserCheck, Trophy } from "lucide-react";

interface SalesThermometerProps {
  leads: Lead[];
}


/**
 * Funil minimalista: barra de progresso horizontal + 4 indicadores de texto.
 * Estilo Linear/Vercel — sem círculos, sem cores fortes.
 */
export function SalesThermometer({ leads }: SalesThermometerProps) {
  const stages = useMemo(() => {
    const total = leads.length;
    const agendou = leads.filter((l) =>
      ["Agendou Exame", "Não Compareceu", "Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const compareceu = leads.filter((l) =>
      ["Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const comprou = leads.filter((l) => l.status === "Compareceu e Comprou").length;

    return [
      { key: "captacao",   label: "Captação",       count: total,      conv: null as number | null,                          Icon: Sparkles },
      { key: "agendou",    label: "Agendamento",    count: agendou,    conv: total > 0 ? agendou / total : null,             Icon: CalendarCheck },
      { key: "compareceu", label: "Comparecimento", count: compareceu, conv: agendou > 0 ? compareceu / agendou : null,      Icon: UserCheck },
      { key: "comprou",    label: "Venda",          count: comprou,    conv: compareceu > 0 ? comprou / compareceu : null,   Icon: Trophy },
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
          Jornada de Conquistas
        </CardTitle>
        <span className="text-[11px] tabular-nums text-foreground font-medium">
          {overallConv.toFixed(1)}%
          <span className="ml-2 text-muted-foreground font-light uppercase tracking-[0.2em] text-[9px]">
            conversão total
          </span>
        </span>
      </CardHeader>

      <CardContent className="px-6 pb-8 pt-4">
        {/* Trilha de conquistas — 4 nós conectados por linha neon */}
        <div className="relative">
          {/* Linha base e linha neon de progresso (atrás dos cards) */}
          <div className="absolute top-[34px] left-[12.5%] right-[12.5%] h-px pointer-events-none">
            <div className="absolute inset-0 bg-white/5" />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.55)] transition-all"
              style={{ width: `${overallConv}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-6 relative">
            {stages.map((s, i) => {
              const isLast = i === stages.length - 1;
              const Icon = s.Icon;
              // "boa conversão" = >= 50% entre etapas (ou venda concluída)
              const convPct = s.conv === null ? null : s.conv * 100;
              const isHot = (convPct !== null && convPct >= 50) || (isLast && s.count > 0);
              const reached = s.count > 0;

              return (
                <div key={s.key} className="flex flex-col items-center text-center min-w-0">
                  {/* Nó/ícone — círculo glass com glow quando "hot" */}
                  <div
                    className={cn(
                      "relative h-[68px] w-[68px] rounded-full flex items-center justify-center backdrop-blur-md border transition-all",
                      reached
                        ? "bg-zinc-900/70 border-white/10"
                        : "bg-zinc-900/30 border-white/5",
                      isHot &&
                        "border-emerald-400/40 shadow-[0_0_24px_rgba(16,185,129,0.35),inset_0_0_16px_rgba(16,185,129,0.10)]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isHot ? "text-emerald-400" : reached ? "text-zinc-300" : "text-zinc-600"
                      )}
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Label da etapa */}
                  <span className="mt-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold truncate w-full">
                    {s.label}
                  </span>

                  {/* Contagem + taxa de conversão */}
                  <div className="mt-2 flex items-baseline justify-center gap-2">
                    <span
                      className={cn(
                        "font-mono-luxe text-2xl font-bold tabular-nums tracking-tighter leading-none",
                        isHot ? "text-emerald-400" : "text-foreground"
                      )}
                    >
                      {s.count}
                    </span>
                    {i > 0 && (
                      <span
                        className={cn(
                          "font-mono-luxe text-[11px] tabular-nums font-medium",
                          isHot ? "text-emerald-400/80" : "text-zinc-500"
                        )}
                      >
                        {formatPct(s.conv)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
