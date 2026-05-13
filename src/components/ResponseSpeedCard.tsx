import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";

interface Props {
  leads: Lead[];
}

function fmtDuration(min: number) {
  if (!isFinite(min) || min <= 0) return "—";
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

export function ResponseSpeedCard({ leads }: Props) {
  const { avg, badge, under5, under15, awaiting, avgFollowUps } = useMemo(() => {
    const responded = leads.filter((l) => l.last_follow_up_at && l.created_at);
    const diffs = responded
      .map(
        (l) =>
          (new Date(l.last_follow_up_at as string).getTime() -
            new Date(l.created_at).getTime()) /
          60000
      )
      .filter((v) => v >= 0);
    const avg = diffs.length ? diffs.reduce((s, v) => s + v, 0) / diffs.length : 0;

    let badge: { label: string; tone: "good" | "warn" | "bad" } = {
      label: "Sem dados",
      tone: "warn",
    };
    if (diffs.length) {
      if (avg <= 5) badge = { label: "Excelente", tone: "good" };
      else if (avg <= 15) badge = { label: "Atenção", tone: "warn" };
      else badge = { label: "Crítico", tone: "bad" };
    }

    const under5 = diffs.filter((v) => v <= 5).length;
    const under15 = diffs.filter((v) => v > 5 && v <= 15).length;
    const awaiting = leads.filter(
      (l) => l.status === "Aguardando Resposta" || l.status === "Novo Lead"
    ).length;

    const fuCounts = leads.map((l) => Number(l.follow_up_count) || 0);
    const avgFollowUps = fuCounts.length
      ? fuCounts.reduce((s, v) => s + v, 0) / fuCounts.length
      : 0;

    return { avg, badge, under5, under15, awaiting, avgFollowUps };
  }, [leads]);

  const totalDist = under5 + under15 + awaiting || 1;

  const badgeStyle =
    badge.tone === "good"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : badge.tone === "warn"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

  const rows = [
    { label: "Respondidos em < 5min", value: under5, color: "bg-emerald-500" },
    { label: "Respondidos em < 15min", value: under15, color: "bg-amber-500" },
    { label: "Aguardando Resposta", value: awaiting, color: "bg-rose-500" },
  ];

  return (
    <Card
      className="rounded-2xl p-7 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#222222] shadow-sm h-full flex flex-col"
      style={{ fontFamily: "'Inter','Geist Sans',sans-serif" }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
          Velocidade de Atendimento
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-10 items-center">
        {/* Cronômetro — esquerda */}
        <div className="flex flex-col items-start text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-3">
            Tempo Médio · 1º contato
          </p>
          <p className="text-6xl font-bold tracking-tighter tabular-nums text-[#1D1D1F] dark:text-white leading-none">
            {fmtDuration(avg)}
          </p>
          <span
            className={`mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1 rounded-full border ${badgeStyle}`}
          >
            {badge.label}
          </span>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-[#222222] w-full">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-2">
              Média de Follow-ups · por lead
            </p>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-[#1D1D1F] dark:text-white leading-none">
              {avgFollowUps.toFixed(1)}{" "}
              <span className="text-[11px] font-medium text-zinc-500 tracking-normal">
                contatos
              </span>
            </p>
          </div>
        </div>

        {/* Distribuição — direita */}
        <div className="space-y-4 sm:border-l sm:border-slate-200 sm:dark:border-[#222222] sm:pl-10">
          {rows.map((r) => {
            const pct = (r.value / totalDist) * 100;
            return (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${r.color}`} />
                    <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                      {r.label}
                    </span>
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums text-[#1D1D1F] dark:text-white">
                    {r.value}
                  </span>
                </div>
                <div className="h-[3px] w-full rounded-full bg-slate-100 dark:bg-[#1c1c1c] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
