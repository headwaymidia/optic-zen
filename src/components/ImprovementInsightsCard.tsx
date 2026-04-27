import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { MessageCircle, AlertCircle, Sparkles } from "lucide-react";

interface Props {
  leads: Lead[];
}

type Severity = "high" | "medium" | "low";

interface Insight {
  severity: Severity;
  source: "whatsapp" | "processo" | "pdv";
  title: string;
  improvement: string;
}

const PRICE_MATCH = ["preç", "preco", "caro", "valor", "orçament", "orcament"];

export function ImprovementInsightsCard({ leads }: Props) {
  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];

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
    const noShow = leads.filter((l) => l.status === "Não Compareceu").length;
    const lost = leads.filter((l) => l.status === "Compareceu e Não Comprou");

    // 1. 🟠/🔴 Gargalo de Agendamento (Lead → Agendamento < 50%)
    if (totalLeads >= 5) {
      const conv = (scheduled / totalLeads) * 100;
      if (conv < 50) {
        list.push({
          severity: conv < 30 ? "high" : "medium",
          source: "whatsapp",
          title: `Taxa de Agendamento Baixa (${conv.toFixed(0)}%). Sua equipe não está convertendo o lead do WhatsApp em visita física.`,
          improvement: "Treinar script de convite para exame.",
        });
      }
    }

    // 2. 🔴 Fuga de Receita / Vazamento no PDV (Vendas / Comparecimentos < 70%)
    if (attended >= 3) {
      const closeRate = (sold / attended) * 100;
      if (closeRate < 70) {
        const leak = attended - sold;
        list.push({
          severity: closeRate < 50 ? "high" : "medium",
          source: "pdv",
          title: `Vazamento no PDV: ${leak} ${leak === 1 ? "cliente veio" : "clientes vieram"} à loja mas ${leak === 1 ? "saiu" : "saíram"} sem comprar.`,
          improvement: "Verificar se a objeção é preço ou falta de estoque de armações.",
        });
      }
    }

    // 3. 🟡 Alerta de No-Show (Comparecimentos / Agendamentos < 60%)
    if (scheduled >= 5) {
      const showRate = (attended / scheduled) * 100;
      if (showRate < 60) {
        list.push({
          severity: showRate < 40 ? "high" : "medium",
          source: "processo",
          title: `Alerta de Não-Comparecimento: ${noShow} agendados não compareceram (${(100 - showRate).toFixed(0)}% de no-show).`,
          improvement: "Implementar confirmação de consulta 2h antes via WhatsApp.",
        });
      }
    }

    // 4. Lentidão no retorno (WhatsApp)
    const now = Date.now();
    const slow = leads.filter((l) => {
      if (l.status !== "Aguardando Resposta" && l.status !== "Novo Lead") return false;
      const ref = l.last_inbound_at || l.created_at;
      return ref && (now - new Date(ref).getTime()) / 60000 > 20;
    }).length;
    if (slow > 0) {
      list.push({
        severity: slow >= 5 ? "high" : "medium",
        source: "whatsapp",
        title: `Lentidão no Retorno: ${slow} ${slow === 1 ? "lead aguardando" : "leads aguardando"} há mais de 20 minutos no WhatsApp.`,
        improvement: "Cobrar equipe de vendas imediatamente.",
      });
    }

    // 5. Objeção de preço recorrente
    const priceLost = lost.filter((l) => {
      const n = (l.notes || "").toLowerCase();
      return PRICE_MATCH.some((m) => n.includes(m));
    }).length;
    if (priceLost >= 2) {
      list.push({
        severity: priceLost >= 4 ? "high" : "medium",
        source: "whatsapp",
        title: `Objeção de Preço recorrente: ${priceLost} perdas por valor alto detectadas nas conversas.`,
        improvement: "Reforçar parcelamento e garantia já no primeiro contato.",
      });
    }

    // 6. Falta de follow-up (WhatsApp)
    const noFu = leads.filter(
      (l) =>
        (Number(l.follow_up_count) || 0) === 0 &&
        (l.status === "Em Atendimento" || l.status === "Aguardando Resposta")
    ).length;
    if (noFu >= 3) {
      list.push({
        severity: "medium",
        source: "whatsapp",
        title: `${noFu} leads ativos sem nenhum follow-up registrado.`,
        improvement: "Definir cadência mínima de 3 contatos por lead.",
      });
    }

    // ordena por severidade
    const order = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => order[a.severity] - order[b.severity]);
    return list.slice(0, 5);
  }, [leads]);

  const dotStyle = (s: Severity) =>
    s === "high"
      ? "bg-rose-500"
      : s === "medium"
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <Card
      className="rounded-2xl p-5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#222222] shadow-sm h-full flex flex-col"
      style={{ fontFamily: "'Inter','Geist Sans',sans-serif" }}
    >
      {/* Header com selo "AI Analisando WhatsApp" */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
            Pontos de Melhoria
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
            IA · Analisando Processos
          </span>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center px-2">
          <div>
            <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              Tudo limpo.
            </p>
            <p className="text-[10px] text-zinc-500 leading-snug">
              Nenhum gargalo detectado nas conversas.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3 flex-1 overflow-hidden">
          {insights.map((i, idx) => (
            <li
              key={idx}
              className="flex gap-2.5 pb-3 border-b border-slate-100 dark:border-[#1a1a1a] last:border-0 last:pb-0"
            >
              <AlertCircle
                className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                  i.severity === "high"
                    ? "text-rose-500"
                    : i.severity === "medium"
                    ? "text-amber-500"
                    : "text-emerald-500"
                }`}
                strokeWidth={2.2}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded ${
                      i.source === "whatsapp"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : i.source === "pdv"
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {i.source === "whatsapp" ? "WhatsApp" : i.source === "pdv" ? "PDV" : "Processo"}
                  </span>
                </div>
                <p className="text-[11px] font-normal leading-snug text-zinc-600 dark:text-zinc-400">
                  {i.title}
                </p>
                <p className="text-[11px] leading-snug text-[#1D1D1F] dark:text-white mt-1.5">
                  <span className="font-semibold">Melhoria:</span>{" "}
                  <span className="font-semibold">{i.improvement}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
