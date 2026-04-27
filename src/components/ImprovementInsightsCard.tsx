import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { Sparkles } from "lucide-react";

interface Props {
  leads: Lead[];
}

type Severity = "high" | "medium";

interface Alert {
  severity: Severity;
  title: string;
  description: string;
}

export function ImprovementInsightsCard({ leads }: Props) {
  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];

    const totalLeads = leads.length;
    const scheduled = leads.filter((l) =>
      [
        "Agendou Exame",
        "Não Compareceu",
        "Compareceu e Comprou",
        "Compareceu e Não Comprou",
      ].includes(l.status)
    ).length;
    const attended = leads.filter((l) =>
      ["Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status)
    ).length;
    const sold = leads.filter((l) => l.status === "Compareceu e Comprou").length;

    // 1. Gargalo de Conversão (Leads → Agendados) — meta 50%
    if (totalLeads >= 5) {
      const conv = (scheduled / totalLeads) * 100;
      if (conv < 50) {
        list.push({
          severity: "high",
          title: `Baixa Conversão de Contato (${conv.toFixed(0)}%)`,
          description:
            "O volume de entrada de leads está no padrão, mas a taxa de conversão para agendamentos está abaixo da meta do funil. Ocorreu retenção na etapa de primeiro atendimento.",
        });
      }
    }

    // 2. Gargalo de Abstenção (Agendados → Compareceram) — meta 60% comparecimento
    if (scheduled >= 5) {
      const showRate = (attended / scheduled) * 100;
      const absRate = 100 - showRate;
      if (showRate < 60) {
        list.push({
          severity: "medium",
          title: `Alta Abstenção em Exames (${absRate.toFixed(0)}%)`,
          description:
            "Desconexão entre agendamentos e visitas. Grande parte dos leads que reservam horário não está concluindo o comparecimento físico na loja.",
        });
      }
    }

    // 3. Gargalo de Fechamento (Compareceram → Compraram) — meta 70%
    if (attended >= 3) {
      const closeRate = (sold / attended) * 100;
      if (closeRate < 70) {
        list.push({
          severity: closeRate < 50 ? "high" : "medium",
          title: `Queda no Fechamento (${closeRate.toFixed(0)}%)`,
          description:
            "Baixa retenção de balcão. O fluxo de clientes realizando exames na loja é alto, mas a taxa de finalização de vendas (óculos/lentes) está sofrendo ruptura após a receita.",
        });
      }
    }

    const order = { high: 0, medium: 1 };
    list.sort((a, b) => order[a.severity] - order[b.severity]);
    return list;
  }, [leads]);

  return (
    <Card
      className="rounded-2xl p-5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#222222] shadow-sm h-full flex flex-col"
      style={{ fontFamily: "'Inter','Geist Sans',sans-serif" }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
            Alertas de Performance
          </p>
          <div className="flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              live
            </span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={2.2} />
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
            IA · Auditoria de Funil
          </span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center px-2">
          <div>
            <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              Funil saudável.
            </p>
            <p className="text-[10px] text-zinc-500 leading-snug">
              Nenhum gargalo matemático detectado.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-4 flex-1 overflow-hidden">
          {alerts.map((a, idx) => (
            <li
              key={idx}
              className="pb-4 border-b border-slate-100 dark:border-[#1a1a1a] last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-[11px] leading-none mt-0.5">
                  {a.severity === "high" ? "🔴" : "🟡"}
                </span>
                <p className="text-[12px] font-semibold leading-snug text-[#1D1D1F] dark:text-white tracking-tight">
                  {a.title}
                </p>
              </div>
              <p className="text-[11px] font-normal leading-relaxed text-zinc-600 dark:text-zinc-400 pl-[18px]">
                {a.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
