import { useMemo } from "react";
import { useLeads } from "@/hooks/useLeads";
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
import { TrendingUp, Users, ShoppingBag, Target, DollarSign } from "lucide-react";
import { eachDayOfInterval, format, isSameDay, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACCENT = "#FACC15"; // amarelo/dourado
const EMERALD = "#10B981";
const CYAN = "#22D3EE";
const ROSE = "#F43F5E";
const VIOLET = "#A78BFA";

const FUNNEL_STAGES = [
  { key: "captacao", label: "Captação", color: CYAN },
  { key: "agendamento", label: "Agendamento", color: VIOLET },
  { key: "comparecimento", label: "Comparecimento", color: ACCENT },
  { key: "venda", label: "Venda", color: EMERALD },
];

const LOSS_REASONS = [
  { key: "preco", label: "Preço", color: ROSE, match: ["preç", "caro", "valor"] },
  { key: "distancia", label: "Distância", color: VIOLET, match: ["dist", "long", "endere"] },
  { key: "semresposta", label: "Sem Resposta", color: "#64748B", match: ["sem resp", "não resp", "nao resp", "silenc"] },
  { key: "outros", label: "Outros", color: ACCENT, match: [] },
];

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function computeFunnel(leads: Lead[]) {
  const captacao = leads.length;
  const agendaPlus = leads.filter((l) =>
    ["Agendou Exame", "Não Compareceu", "Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status),
  ).length;
  const compareceuPlus = leads.filter((l) =>
    ["Compareceu e Comprou", "Compareceu e Não Comprou"].includes(l.status),
  ).length;
  const venda = leads.filter((l) => l.status === "Compareceu e Comprou").length;
  return { captacao, agendamento: agendaPlus, comparecimento: compareceuPlus, venda };
}

function classifyLoss(notes: string | null): string {
  if (!notes) return "outros";
  const n = notes.toLowerCase();
  for (const r of LOSS_REASONS) {
    if (r.match.some((m) => n.includes(m))) return r.key;
  }
  return "outros";
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent = ACCENT,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-white tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm p-5 shadow-lg ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#0F172A",
  border: "1px solid #1E293B",
  borderRadius: 8,
  color: "#F1F5F9",
  fontSize: 12,
};

export default function DashboardExecutivo() {
  const { leads, loading } = useLeads();

  const totals = useMemo(() => {
    const total = leads.length;
    const vendas = leads.filter((l) => l.status === "Compareceu e Comprou");
    const totalVendas = vendas.length;
    const conversao = pct(totalVendas, total);
    const receita = vendas.reduce((acc, l) => acc + (l.sale_value ?? 0), 0);
    const ticket = totalVendas > 0 ? receita / totalVendas : 0;
    return { total, totalVendas, conversao, ticket, receita };
  }, [leads]);

  const funnel = useMemo(() => computeFunnel(leads), [leads]);

  const funnelData = useMemo(
    () =>
      FUNNEL_STAGES.map((s, idx) => {
        const value = (funnel as any)[s.key] as number;
        const prev = idx === 0 ? value : ((funnel as any)[FUNNEL_STAGES[idx - 1].key] as number);
        const conv = idx === 0 ? 100 : pct(value, prev);
        return { name: s.label, value, fill: s.color, conv };
      }),
    [funnel],
  );

  const timelineData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    return days.map((d) => {
      const dayLeads = leads.filter((l) => l.created_at && isSameDay(parseISO(l.created_at), d));
      const novos = dayLeads.length;
      const vendas = leads.filter((l) => {
        if (l.status !== "Compareceu e Comprou") return false;
        const ref = l.updated_at ?? l.created_at;
        return ref && isSameDay(parseISO(ref), d);
      }).length;
      return {
        date: format(d, "EEE dd", { locale: ptBR }),
        novos,
        vendas,
      };
    });
  }, [leads]);

  const lossData = useMemo(() => {
    const lost = leads.filter((l) => l.status === "Compareceu e Não Comprou");
    const counts: Record<string, number> = { preco: 0, distancia: 0, semresposta: 0, outros: 0 };
    lost.forEach((l) => {
      counts[classifyLoss(l.notes)] += 1;
    });
    return LOSS_REASONS.map((r) => ({ name: r.label, value: counts[r.key], color: r.color })).filter((d) => d.value > 0);
  }, [leads]);

  return (
    <div className="min-h-screen bg-slate-950 -m-4 sm:-m-6 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-400 mb-1">
            Business Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Painel Executivo</h1>
          <p className="text-sm text-slate-400 mt-1">Visão consolidada de tráfego, conversão e performance.</p>
        </div>
        <div className="text-xs text-slate-500">
          Atualizado em {format(new Date(), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Users} label="Total de Leads" value={String(totals.total)} accent={CYAN} />
        <KpiCard icon={ShoppingBag} label="Vendas Concluídas" value={String(totals.totalVendas)} accent={EMERALD} />
        <KpiCard
          icon={Target}
          label="Taxa de Conversão"
          value={`${totals.conversao}%`}
          accent={ACCENT}
          hint={`${totals.totalVendas} de ${totals.total} leads`}
        />
        <KpiCard
          icon={DollarSign}
          label="Ticket Médio"
          value={brl(totals.ticket)}
          accent={VIOLET}
          hint={`Receita total ${brl(totals.receita)}`}
        />
      </div>

      {/* Funnel */}
      <Panel title="Funil de Conversão" subtitle="Da captação até o fechamento da venda" className="mb-6">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ top: 8, right: 56, left: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748B", fontSize: 11 }} stroke="#1E293B" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#CBD5E1", fontSize: 12, fontWeight: 600 }}
                stroke="#1E293B"
                width={130}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, _n, p: any) => [`${v} leads (${p?.payload?.conv}%)`, "Volume"]}
                cursor={{ fill: "rgba(250,204,21,0.05)" }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={36}>
                {funnelData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="conv"
                  position="right"
                  formatter={(v: number) => `${v}%`}
                  style={{ fill: "#FACC15", fontSize: 12, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Timeline + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Leads vs Vendas" subtitle="Últimos 7 dias" className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gNovos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CYAN} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={EMERALD} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} stroke="#1E293B" />
                <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} stroke="#1E293B" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#FACC15", strokeOpacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#CBD5E1", paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="novos" name="Novos Leads" stroke={CYAN} strokeWidth={2} fill="url(#gNovos)" />
                <Area type="monotone" dataKey="vendas" name="Vendas" stroke={EMERALD} strokeWidth={2} fill="url(#gVendas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Motivos de Perda" subtitle="Leads que não converteram">
          {lossData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-slate-500">
              Sem dados de perda no período.
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} leads`, n]} />
                  <Pie
                    data={lossData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {lossData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: "#CBD5E1" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {loading && <div className="mt-6 text-center text-sm text-slate-500">Carregando dados...</div>}
    </div>
  );
}
