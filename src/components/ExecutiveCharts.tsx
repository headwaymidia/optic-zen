import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
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
const EMERALD = "#10B981";
const ZINC_400 = "#a1a1aa";
const ZINC_500 = "#71717a";
const ZINC_600 = "#52525b";
const ZINC_700 = "#3f3f46";

const FUNNEL_STAGES = [
  { key: "captacao", label: "Captação", color: WHITE },
  { key: "agendamento", label: "Agendamento", color: ZINC_400 },
  { key: "comparecimento", label: "Comparecimento", color: ZINC_500 },
  { key: "venda", label: "Venda", color: EMERALD },
];

const LOSS_REASONS = [
  { key: "preco", label: "Preço", color: WHITE, match: ["preç", "caro", "valor"] },
  { key: "distancia", label: "Distância", color: ZINC_400, match: ["dist", "long", "endere"] },
  { key: "semresposta", label: "Sem Resposta", color: ZINC_600, match: ["sem resp", "não resp", "nao resp", "silenc"] },
  { key: "outros", label: "Outros", color: ZINC_700, match: [] },
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

export function ConversionFunnel({ leads }: { leads: Lead[] }) {
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

export function LeadsVsSalesTimeline({ leads, embedded = false }: { leads: Lead[]; embedded?: boolean }) {
  const data = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    return days.map((d) => {
      const novos = leads.filter((l) => l.created_at && isSameDay(parseISO(l.created_at), d)).length;
      const vendas = leads.filter((l) => {
        if (l.status !== "Compareceu e Comprou") return false;
        const ref = l.updated_at ?? l.created_at;
        return ref && isSameDay(parseISO(ref), d);
      }).length;
      return { date: format(d, "EEE dd", { locale: ptBR }), novos, vendas };
    });
  }, [leads]);

  const chart = (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
          <defs>
            <filter id="emeraldGlow" x="-20%" y="-50%" width="140%" height="200%">
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
          <Area type="monotone" dataKey="novos" name="Leads" stroke={WHITE} strokeWidth={1.5} fill="none" dot={false} activeDot={{ r: 2.5, fill: WHITE }} />
          <Area type="monotone" dataKey="vendas" name="Vendas" stroke={EMERALD} strokeWidth={1.5} fill="none" dot={false} activeDot={{ r: 2.5, fill: EMERALD }} filter="url(#emeraldGlow)" />
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

export function LossReasonsDonut({ leads }: { leads: Lead[] }) {
  const data = useMemo(() => {
    const lost = leads.filter((l) => l.status === "Compareceu e Não Comprou");
    const counts: Record<string, number> = { preco: 0, distancia: 0, semresposta: 0, outros: 0 };
    lost.forEach((l) => {
      counts[classifyLoss(l.notes)] += 1;
    });
    return LOSS_REASONS.map((r) => ({ name: r.label, value: counts[r.key], color: r.color })).filter((d) => d.value > 0);
  }, [leads]);

  return (
    <Card className="glass-card rounded-lg h-full border-0">
      <CardHeader className="pb-2 pt-5 px-6">
        <CardTitle className="text-[10px] font-light uppercase tracking-[0.3em] text-muted-foreground">
          Motivos de Perda
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {data.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground font-extralight">
            Sem dados de perda no período.
          </div>
        ) : (
          <div className="relative h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} leads`, n]} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={62}
                  outerRadius={65}
                  paddingAngle={2}
                  stroke="none"
                  strokeWidth={3}
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={5}
                  wrapperStyle={{ fontSize: 10, color: ZINC_400, fontWeight: 200, letterSpacing: "0.1em" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Ícone discreto centralizado no anel */}
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center" style={{ paddingTop: "calc(45% - 8px)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
