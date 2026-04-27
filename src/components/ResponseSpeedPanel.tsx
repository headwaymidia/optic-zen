import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { Zap, MessageSquare, Clock } from "lucide-react";

interface Props {
  leads: Lead[];
}

const PAID_SOURCES = new Set(["Instagram", "Google Ads", "Facebook"]);

function fmtDuration(min: number) {
  if (!isFinite(min) || min <= 0) return "—";
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  if (m < 60) return `${m}min ${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

export function ResponseSpeedPanel({ leads }: Props) {
  const { avgResponseMin, badge, followUps, avgFollowUps, awaiting } = useMemo(() => {
    const paid = leads.filter((l) => l.lead_source && PAID_SOURCES.has(String(l.lead_source)));
    // tempo de resposta = created_at -> last_follow_up_at (primeiro contato)
    const responded = paid.filter((l) => l.last_follow_up_at && l.created_at);
    const diffsMin = responded.map(
      (l) =>
        (new Date(l.last_follow_up_at as string).getTime() -
          new Date(l.created_at).getTime()) /
        60000
    ).filter((v) => v >= 0);
    const avgResponseMin =
      diffsMin.length > 0 ? diffsMin.reduce((s, v) => s + v, 0) / diffsMin.length : 0;

    let badge: { label: string; tone: "good" | "warn" | "bad" } = {
      label: "Sem dados",
      tone: "warn",
    };
    if (diffsMin.length > 0) {
      if (avgResponseMin <= 5) badge = { label: "Excelente", tone: "good" };
      else if (avgResponseMin <= 15) badge = { label: "Atenção", tone: "warn" };
      else badge = { label: "Crítico", tone: "bad" };
    }

    // distribuição de follow-ups (0,1,2,3,4,5+)
    const buckets = [0, 0, 0, 0, 0, 0];
    leads.forEach((l) => {
      const c = Math.max(0, Number(l.follow_up_count) || 0);
      buckets[Math.min(c, 5)]++;
    });
    const totalContacts = leads.reduce(
      (s, l) => s + (Number(l.follow_up_count) || 0),
      0
    );
    const avgFollowUps = leads.length > 0 ? totalContacts / leads.length : 0;

    // aguardando há mais de 10min
    const now = Date.now();
    const awaiting = leads.filter((l) => {
      if (l.status !== "Aguardando Resposta" && l.status !== "Novo Lead") return false;
      const ref = l.last_inbound_at || l.created_at;
      if (!ref) return false;
      return (now - new Date(ref).getTime()) / 60000 > 10;
    }).length;

    return { avgResponseMin, badge, followUps: buckets, avgFollowUps, awaiting };
  }, [leads]);

  const maxBucket = Math.max(...followUps, 1);

  const badgeStyle =
    badge.tone === "good"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : badge.tone === "warn"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

  return (
    <Card
      className="rounded-2xl p-6 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#222222] shadow-sm"
      style={{ fontFamily: "'Inter','Geist Sans',sans-serif" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
            Velocidade de Resposta
          </p>
        </div>
      </div>

      {/* Cronômetro */}
      <div className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 mb-2">
          Tempo médio · 1º contato (tráfego pago)
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-4xl sm:text-5xl font-bold tracking-tighter tabular-nums text-[#1D1D1F] dark:text-white">
            {fmtDuration(avgResponseMin)}
          </p>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full border ${badgeStyle}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* Volume de follow-ups */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3 text-zinc-500" strokeWidth={2} />
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
              Volume de Follow-ups
            </p>
          </div>
          <p className="text-[11px] font-medium text-zinc-500 tabular-nums">
            Média {avgFollowUps.toFixed(1)} por lead
          </p>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {followUps.map((v, i) => {
            const h = (v / maxBucket) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-sm bg-[#1D1D1F] dark:bg-white transition-all"
                    style={{ height: `${Math.max(h, 4)}%`, opacity: 0.4 + (i / 5) * 0.6 }}
                  />
                </div>
                <span className="text-[9px] font-medium text-zinc-400 tabular-nums">
                  {i === 5 ? "5+" : i}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status de Resposta */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#222222]">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />
          <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Aguardando resposta &gt; 10min
          </p>
        </div>
        <p
          className={`text-lg font-bold tabular-nums tracking-tight ${
            awaiting === 0
              ? "text-emerald-600 dark:text-emerald-400"
              : awaiting > 5
              ? "text-rose-600 dark:text-rose-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {awaiting}
        </p>
      </div>
    </Card>
  );
}
