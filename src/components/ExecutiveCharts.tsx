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

const BLUE = "#3B82F6";
const EMERALD = "#10B981";
const AMBER = "#FBBF24";       // Dourado vibrante
const VIOLET = "#8B5CF6";      // Violeta elétrico
const CYAN = "#06B6D4";        // Ciano para perdas
const ROSE = "#F43F5E";
const SLATE = "#94A3B8";

const FUNNEL_STAGES = [
  { key: "captacao", label: "Captação", color: BLUE },
  { key: "agendamento", label: "Agendamento", color: VIOLET },
  { key: "comparecimento", label: "Comparecimento", color: AMBER },
  { key: "venda", label: "Venda", color: EMERALD },
];

const LOSS_REASONS = [
  { key: "preco", label: "Preço", color: ROSE, match: ["preç", "caro", "valor"] },
  { key: "distancia", label: "Distância", color: VIOLET, match: ["dist", "long", "endere"] },
  { key: "semresposta", label: "Sem Resposta", color: SLATE, match: ["sem resp", "não resp", "nao resp", "silenc"] },
  { key: "outros", label: "Outros", color: CYAN, match: [] },
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
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 12,
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

export function LeadsVsSalesTimeline({ leads }: { leads: Lead[] }) {
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

  return (
    <Card className="border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider">Leads vs Vendas</CardTitle>
        <p className="text-[11px] text-muted-foreground">Últimos 7 dias</p>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gNovosLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gVendasLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EMERALD} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: BLUE, strokeOpacity: 0.15, strokeWidth: 1 }} />
              <Area type="monotone" dataKey="novos" name="Novos Leads" stroke={BLUE} strokeWidth={2} fill="url(#gNovosLight)" dot={false} activeDot={{ r: 3 }} />
              <Area type="monotone" dataKey="vendas" name="Vendas" stroke={EMERALD} strokeWidth={2} fill="url(#gVendasLight)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
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
    <Card className="border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider">Motivos de Perda</CardTitle>
        <p className="text-[11px] text-muted-foreground">Leads que não converteram</p>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {data.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
            Sem dados de perda no período.
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} leads`, n]} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
