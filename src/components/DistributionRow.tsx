import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PAID_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);
const REFERRAL_SOURCES = new Set(["Indicação", "WhatsApp"]);

const SOURCE_PALETTE = {
  paid: "#10B981", // Esmeralda
  organic: "#6366F1", // Índigo
  referral: "#8B5CF6", // Violeta
  other: "#3F3F46",
};

const LOSS_REASONS = [
  { key: "preco", label: "Preço", color: "#10B981", match: ["preç", "caro", "valor"] },
  { key: "distancia", label: "Distância", color: "#6366F1", match: ["dist", "long", "endere"] },
  { key: "tempo", label: "Falta de Tempo", color: "#8B5CF6", match: ["tempo", "ocupad"] },
  { key: "semresposta", label: "Sem Resposta", color: "#06B6D4", match: ["sem resp", "não resp", "nao resp"] },
  { key: "outros", label: "Outros", color: "#3F3F46", match: [] as string[] },
];

function classifyLoss(notes: string | null): string {
  if (!notes) return "outros";
  const n = notes.toLowerCase();
  for (const r of LOSS_REASONS) {
    if (r.match.length && r.match.some((m) => n.includes(m))) return r.key;
  }
  return "outros";
}

function classifySource(src: string | null): "paid" | "organic" | "referral" | "other" {
  if (!src) return "other";
  if (PAID_SOURCES.has(src)) return "paid";
  if (REFERRAL_SOURCES.has(src)) return "referral";
  return "organic";
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 11,
};

interface DonutBlockProps {
  title: string;
  subtitle: string;
  data: { name: string; value: number; color: string }[];
}

function DonutBlock({ title, subtitle, data }: DonutBlockProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="glass-card rounded-xl border-0 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1.5">
            {title}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {data.length === 0 || total === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground font-light">
          Sem dados no período.
        </div>
      ) : (
        <div className="flex items-center gap-6 h-[200px]">
          <div className="relative h-full w-[170px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [`${v}`, n]}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono-luxe text-2xl font-bold tabular-nums text-foreground tracking-tighter leading-none">
                {total}
              </span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mt-1">
                Total
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-2.5 min-w-0">
            {data.map((d) => {
              const p = total > 0 ? (d.value / total) * 100 : 0;
              return (
                <div key={d.name} className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[11px] text-zinc-300 font-medium truncate flex-1">
                    {d.name}
                  </span>
                  <span className="font-mono-luxe text-[11px] tabular-nums text-foreground font-semibold">
                    {p.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export function DistributionRow({ leads }: { leads: Lead[] }) {
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = { paid: 0, organic: 0, referral: 0, other: 0 };
    leads.forEach((l) => {
      counts[classifySource(l.lead_source as string | null)] += 1;
    });
    return [
      { name: "Tráfego Pago", value: counts.paid, color: SOURCE_PALETTE.paid },
      { name: "Orgânico", value: counts.organic, color: SOURCE_PALETTE.organic },
      { name: "Referencial", value: counts.referral, color: SOURCE_PALETTE.referral },
      { name: "Outros", value: counts.other, color: SOURCE_PALETTE.other },
    ].filter((d) => d.value > 0);
  }, [leads]);

  const lossData = useMemo(() => {
    const lost = leads.filter((l) => l.status === "Compareceu e Não Comprou");
    const counts: Record<string, number> = {};
    LOSS_REASONS.forEach((r) => (counts[r.key] = 0));
    lost.forEach((l) => {
      counts[classifyLoss(l.notes)] += 1;
    });
    return LOSS_REASONS.map((r) => ({
      name: r.label,
      value: counts[r.key],
      color: r.color,
    })).filter((d) => d.value > 0);
  }, [leads]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DonutBlock
        title="Origem dos Leads"
        subtitle="Pago · Orgânico · Referencial"
        data={sourceData}
      />
      <DonutBlock
        title="Motivos de Perda"
        subtitle="Distribuição de não-conversões"
        data={lossData}
      />
    </div>
  );
}
