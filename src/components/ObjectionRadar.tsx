import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { ShieldAlert } from "lucide-react";

interface Props {
  leads: Lead[];
}

const OBJECTIONS = [
  {
    key: "preco",
    label: "Preço / Orçamento",
    match: ["preç", "preco", "caro", "valor", "orçament", "orcament", "parcel"],
    suggestion: "Reforçar parcelamento ou garantia.",
  },
  {
    key: "conjuge",
    label: "Vai falar com o cônjuge",
    match: ["cônjuge", "conjuge", "espos", "marido", "famíli", "famil", "pensar"],
    suggestion: "Enviar material para compartilhar com a família.",
  },
  {
    key: "distancia",
    label: "Distância da loja",
    match: ["dist", "long", "endere", "bairro", "cidade"],
    suggestion: "Oferecer atendimento agendado ou delivery.",
  },
  {
    key: "pesquisando",
    label: "Apenas pesquisando",
    match: ["pesquis", "olhand", "vendo", "cotand", "cotação", "cotacao"],
    suggestion: "Criar urgência com benefício por tempo limitado.",
  },
  {
    key: "tempo",
    label: "Falta de tempo",
    match: ["tempo", "ocupad", "depois", "semana que vem"],
    suggestion: "Oferecer horário flexível ou fim de semana.",
  },
  {
    key: "concorrente",
    label: "Concorrente",
    match: ["concorr", "outro lugar", "outra ót", "outra ot"],
    suggestion: "Destacar diferenciais e atendimento exclusivo.",
  },
];

function classify(notes: string | null): string | null {
  if (!notes) return null;
  const n = notes.toLowerCase();
  for (const o of OBJECTIONS) {
    if (o.match.some((m) => n.includes(m))) return o.key;
  }
  return null;
}

export function ObjectionRadar({ leads }: Props) {
  const { items, top } = useMemo(() => {
    const counts: Record<string, number> = {};
    OBJECTIONS.forEach((o) => (counts[o.key] = 0));
    leads.forEach((l) => {
      const k = classify(l.notes);
      if (k) counts[k]++;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    const items = OBJECTIONS.map((o) => ({
      ...o,
      count: counts[o.key],
      pct: total > 0 ? (counts[o.key] / total) * 100 : 0,
    }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
    return { items, top: items[0] };
  }, [leads]);

  const max = items[0]?.count ?? 1;

  return (
    <Card
      className="rounded-2xl p-6 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#222222] shadow-sm flex flex-col"
      style={{ fontFamily: "'Inter','Geist Sans',sans-serif" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
            Radar de Objeções
          </p>
        </div>
        <p className="text-[11px] font-medium text-zinc-400 tabular-nums">
          {items.reduce((s, i) => s + i.count, 0)} sinais
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-zinc-500 py-10 text-center">
          Nenhuma objeção mapeada ainda.
        </p>
      ) : (
        <div className="space-y-3.5 flex-1">
          {items.map((it, idx) => {
            const w = (it.count / max) * 100;
            return (
              <div key={it.key}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold tabular-nums text-zinc-400 w-3">
                      {idx + 1}
                    </span>
                    <span className="text-[12px] font-medium text-[#1D1D1F] dark:text-white">
                      {it.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12px] font-semibold tabular-nums text-[#1D1D1F] dark:text-white">
                      {it.count}
                    </span>
                    <span className="text-[10px] tabular-nums text-zinc-400">
                      {it.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-[3px] w-full rounded-full bg-slate-100 dark:bg-[#1c1c1c] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${w}%`,
                      background:
                        idx === 0
                          ? "linear-gradient(90deg,#F43F5E,#FB7185)"
                          : "#1D1D1F",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {top && (
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#222222]">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-1.5">
            Insight automático
          </p>
          <p className="text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Objeção predominante:{" "}
            <span className="font-semibold text-[#1D1D1F] dark:text-white">
              {top.label}
            </span>
            . <span className="text-zinc-500">Sugestão: {top.suggestion}</span>
          </p>
        </div>
      )}
    </Card>
  );
}
