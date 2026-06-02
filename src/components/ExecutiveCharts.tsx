import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { eachDayOfInterval, format, isSameDay, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const WHITE = "#fafafa";
const EMERALD = "#10B981";       /* Verde Esmeralda — Vendas */
const ELECTRIC_BLUE = "#3B82F6"; /* Azul Elétrico — Leads */
const ZINC_400 = "#a1a1aa";
const ZINC_500 = "#71717a";
const ZINC_600 = "#52525b";
const ZINC_700 = "#3f3f46";

// Paleta Premium para Motivos de Perda — Índigo, Violeta, Ciano, Grafite
const INDIGO = "#6366F1";
const VIOLET = "#8B5CF6";
const CYAN = "#06B6D4";
const GRAPHITE = "#3F3F46";

const FUNNEL_STAGES = [
  { key: "captacao", label: "Captação", color: WHITE },
  { key: "agendamento", label: "Agendamento", color: ZINC_400 },
  { key: "comparecimento", label: "Comparecimento", color: ZINC_500 },
  { key: "venda", label: "Venda", color: EMERALD },
];

const LOSS_REASONS = [
  { key: "preco", label: "Preço", color: INDIGO, match: ["preç", "caro", "valor"] },
  { key: "distancia", label: "Distância", color: VIOLET, match: ["dist", "long", "endere"] },
  { key: "semresposta", label: "Sem Resposta", color: CYAN, match: ["sem resp", "não resp", "nao resp", "silenc"] },
  { key: "outros", label: "Outros", color: GRAPHITE, match: [] },
];

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function computeFunnel(leads: Lead[]) {
  const captacao = leads.length;
  const agendamento = leads.filter((l) =>
    ["Agendou Exame", "Não Compareceu", "Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status),
  ).length;
  const comparecimento = leads.filter((l) =>
    ["Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status),
  ).length;
  const venda = leads.filter((l) => l.status === "Compareceu e Comprou").length;
  return { captacao, agendamento, comparecimento, venda };
}

function classifyLoss(notes: string | null): string {
  if (!notes) return "outros";
  const n = notes.toLowerCase();
  for (const r of LOSS_REASONS) {
    if (r.match.some((m) => n.includes(m))) return r.key;
  }
  return "outros";
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  color: "hsl(var(--foreground))",
  fontSize: 11,
};

function ConversionFunnelImpl({ leads }: { leads: Lead[] }) {
  const funnel = useMemo(() => computeFunnel(leads), [leads]);
  const data = useMemo(
    () =>
      FUNNEL_STAGES.map((s, idx) => {
        const value = (funnel as any)[s.key] as number;
        const prev = idx === 0 ? value : ((funnel as any)[FUNNEL_STAGES[idx - 1].key] as number);
        const conv = idx === 0 ? 100 : pct(value, prev);
        return { name: s.label, value, fill: s.color, conv };
      }),
    [funnel],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funil de Conversão</CardTitle>
        <p className="text-xs text-muted-foreground">Da captação até o fechamento da venda</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, left: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fontWeight: 600 }}
                className="fill-foreground"
                width={130}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, _n, p: any) => [`${v} leads (${p?.payload?.conv}%)`, "Volume"]}
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={36}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="conv"
                  position="right"
                  formatter={(v: number) => `${v}%`}
                  style={{ fill: "#0F172A", fontSize: 12, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadsVsSalesTimelineImpl({ leads, embedded = false }: { leads: Lead[]; embedded?: boolean }) {
  const data = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    return days.map((d) => {
      const novos = leads.filter((l) => l.created_at && isSameDay(new Date(l.created_at), d)).length;
      const vendas = leads.filter((l) => {
        if (l.status !== "Compareceu e Comprou") return false;
        const ref = l.updated_at ?? l.created_at;
        return ref && isSameDay(parseISO(ref), d);
      }).length;
      return { date: format(d, "EEE dd", { locale: ptBR }), novos, vendas };
    });
  }, [leads]);

  const chart = (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="leadsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ELECTRIC_BLUE} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ELECTRIC_BLUE} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="vendasAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EMERALD} stopOpacity={0.35} />
              <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
            </linearGradient>
            <filter id="emeraldGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="blueGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip contentStyle={tooltipStyle} cursor={false} />
          <Area type="monotone" dataKey="novos" name="Leads" stroke={ELECTRIC_BLUE} strokeWidth={1.75} fill="url(#leadsAreaGradient)" dot={false} activeDot={{ r: 3, fill: ELECTRIC_BLUE }} filter="url(#blueGlow)" />
          <Area type="monotone" dataKey="vendas" name="Vendas" stroke={EMERALD} strokeWidth={1.75} fill="url(#vendasAreaGradient)" dot={false} activeDot={{ r: 3, fill: EMERALD }} filter="url(#emeraldGlow)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  if (embedded) return chart;

  return (
    <Card className="glass-card rounded-lg border-0">
      <CardHeader className="pb-2 pt-5 px-6">
        <CardTitle className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground">Leads vs Vendas</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">{chart}</CardContent>
    </Card>
  );
}

function LossReasonsDonutImpl({ leads }: { leads: Lead[] }) {
  const data = useMemo(() => {
    const lost = leads.filter((l) => l.status === "Compareceu e Não Comprou");
    const counts: Record<string, number> = { preco: 0, distancia: 0, semresposta: 0, outros: 0 };
    lost.forEach((l) => {
      counts[classifyLoss(l.notes)] += 1;
    });
    return LOSS_REASONS.map((r) => ({ name: r.label, value: counts[r.key], color: r.color })).filter((d) => d.value > 0);
  }, [leads]);

  const totalLost = data.reduce((s, d) => s + d.value, 0);
  // Se só houver "Outros", aplicar gradiente cinza para não parecer um erro
  const onlyOthers = data.length === 1 && data[0].name === "Outros";

  return (
    <Card className="glass-card rounded-lg h-full border-0">
      <CardHeader className="pb-2 pt-5 px-6">
        <CardTitle className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground">
          Motivos de Perda
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {data.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground font-extralight">
            Sem dados de perda no período.
          </div>
        ) : (
          <div className="flex items-center gap-6 h-[220px]">
            {/* Donut ultra-fino: anel de 3px */}
            <div className="relative h-full w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="othersGrayGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#52525b" />
                      <stop offset="100%" stopColor="#27272a" />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} leads`, n]} />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={66}
                    outerRadius={70}
                    paddingAngle={onlyOthers ? 0 : 2}
                    stroke="none"
                  >
                    {data.map((d) => (
                      <Cell
                        key={d.name}
                        fill={onlyOthers ? "url(#othersGrayGradient)" : d.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Total no centro do anel */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-medium">Total</span>
                <span className="font-mono-luxe text-2xl font-semibold tabular-nums text-foreground leading-none mt-1">
                  {totalLost}
                </span>
              </div>
            </div>

            {/* Legenda lateral com porcentagens */}
            <div className="flex-1 flex flex-col justify-center gap-3 min-w-0">
              {data.map((d) => {
                const p = totalLost > 0 ? (d.value / totalLost) * 100 : 0;
                return (
                  <div key={d.name} className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                      aria-hidden
                    />
                    <span className="text-[11px] text-zinc-400 font-medium tracking-wide truncate flex-1">
                      {d.name}
                    </span>
                    <span className="font-mono-luxe text-[11px] tabular-nums text-foreground font-medium">
                      {p.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const ConversionFunnel = memo(ConversionFunnelImpl);
export const LeadsVsSalesTimeline = memo(LeadsVsSalesTimelineImpl);
export const LossReasonsDonut = memo(LossReasonsDonutImpl);
