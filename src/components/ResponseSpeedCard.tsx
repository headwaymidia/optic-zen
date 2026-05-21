import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Lead, supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";
import { Zap } from "lucide-react";
import { businessMinutesBetween, DEFAULT_BUSINESS_HOURS, type BusinessHours } from "@/lib/businessHours";

interface Props {
  leads: Lead[];
}

function fmtDuration(min: number) {
  if (!isFinite(min) || min <= 0) return "—";
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

interface MsgRow {
  lead_id: string | null;
  from_me: boolean;
  timestamp: string;
}

export function ResponseSpeedCard({ leads }: Props) {
  const { currentStoreId } = useStores();

  const { data: messages = [] } = useQuery({
    queryKey: ["wa-msgs-speed", currentStoreId],
    enabled: !!currentStoreId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("lead_id,from_me,timestamp")
        .eq("store_id", currentStoreId!)
        .order("timestamp", { ascending: true })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as MsgRow[];
    },
    staleTime: 60_000,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings-bh", currentStoreId],
    enabled: !!currentStoreId,
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("business_hours_start, business_hours_end, business_days")
        .eq("id", currentStoreId!)
        .maybeSingle();
      return data;
    },
    staleTime: 300_000,
  });

  const businessHours: BusinessHours = {
    start: storeSettings?.business_hours_start ?? DEFAULT_BUSINESS_HOURS.start,
    end: storeSettings?.business_hours_end ?? DEFAULT_BUSINESS_HOURS.end,
    days: storeSettings?.business_days ?? DEFAULT_BUSINESS_HOURS.days,
  };

  const { avg, badge, under5, under15, awaiting, avgFollowUps } = useMemo(() => {
    // Para cada lead: primeira inbound (from_me=false) e primeira outbound (from_me=true)
    const firstIn = new Map<string, number>();
    const firstOut = new Map<string, number>();
    for (const m of messages) {
      if (!m.lead_id) continue;
      const t = new Date(m.timestamp).getTime();
      if (m.from_me) {
        if (!firstOut.has(m.lead_id) || t < (firstOut.get(m.lead_id) as number)) {
          firstOut.set(m.lead_id, t);
        }
      } else {
        if (!firstIn.has(m.lead_id) || t < (firstIn.get(m.lead_id) as number)) {
          firstIn.set(m.lead_id, t);
        }
      }
    }

    const diffs: number[] = [];
    let under5 = 0;
    let under15 = 0;
    let awaiting = 0;
    firstIn.forEach((inT, leadId) => {
      const outT = firstOut.get(leadId);
      if (outT && outT >= inT) {
        const diffMin = businessMinutesBetween(new Date(inT), new Date(outT), businessHours);
        diffs.push(diffMin);
        if (diffMin < 5) under5++;
        else if (diffMin < 15) under15++;
      } else if (!outT) {
        awaiting++;
      }
    });

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

    const fuCounts = leads.map((l) => Number(l.follow_up_count) || 0);
    const avgFollowUps = fuCounts.length
      ? fuCounts.reduce((s, v) => s + v, 0) / fuCounts.length
      : 0;

    return { avg, badge, under5, under15, awaiting, avgFollowUps };
  }, [messages, leads, businessHours]);

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
