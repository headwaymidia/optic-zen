import { useMemo } from "react";
import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Lead, LEAD_STATUSES, LeadStatus } from "@/lib/supabase";

interface Props {
  leads: Lead[];
  from: Date;
  to: Date;
  embedded?: boolean;
}

// Semantic colors per status (HSL strings so we can use them directly in Recharts)
const STATUS_COLORS: Record<LeadStatus, string> = {
  "Novo Lead": "hsl(217 91% 60%)", // azul
  "Em Atendimento": "hsl(190 90% 55%)", // ciano
  "Aguardando Resposta": "hsl(45 93% 55%)", // amarelo
  "Agendou Exame": "hsl(262 83% 62%)", // roxo
  "Não Compareceu": "hsl(0 75% 60%)", // vermelho
  "Compareceu e Comprou": "hsl(142 71% 42%)", // verde
  "Compareceu e Não Comprou": "hsl(220 9% 55%)", // cinza
  Repescagem: "hsl(25 95% 58%)", // laranja
};

interface DayDatum {
  date: string;
  weekday: string;
  total: number;
  [status: string]: string | number;
}

export function LeadsVolumeChart({ leads, from, to }: Props) {
  const data = useMemo<DayDatum[]>(() => {
    const days = eachDayOfInterval({ start: from, end: to });
    return days.map((d) => {
      const dayLeads = leads.filter(
        (l) => l.created_at && isSameDay(parseISO(l.created_at), d)
      );
      const base: DayDatum = {
        date: format(d, "dd/MM", { locale: ptBR }),
        weekday: format(d, "EEE", { locale: ptBR }),
        total: dayLeads.length,
      };
      LEAD_STATUSES.forEach((s) => {
        base[s] = dayLeads.filter((l) => l.status === s).length;
      });
      return base;
    });
  }, [leads, from, to]);

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const datum = payload[0]?.payload as DayDatum | undefined;
    if (!datum) return null;
    const breakdown = LEAD_STATUSES.filter((s) => Number(datum[s]) > 0);
    return (
      <div className="rounded-lg border bg-card p-3 shadow-md text-xs min-w-[180px]">
        <div className="font-semibold mb-1">
          {label} <span className="text-muted-foreground font-normal">({datum.weekday})</span>
        </div>
        <div className="flex items-center justify-between mb-2 pb-2 border-b">
          <span className="text-muted-foreground">Total de Leads</span>
          <span className="font-semibold">{datum.total}</span>
        </div>
        {breakdown.length === 0 ? (
          <div className="text-muted-foreground">Sem leads neste dia</div>
        ) : (
          <ul className="space-y-1">
            {breakdown.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ background: STATUS_COLORS[s] }}
                  />
                  <span className="truncate">{s}</span>
                </div>
                <span className="font-medium tabular-nums">{datum[s]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <Card className="border border-border dark:border-white/5 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] bg-card">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider">Volume de leads por dia</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" axisLine={false} tickLine={false} width={28} />
              <Tooltip content={renderTooltip} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              {LEAD_STATUSES.map((s, idx) => (
                <Bar
                  key={s}
                  dataKey={s}
                  stackId="a"
                  fill={STATUS_COLORS[s]}
                  radius={idx === LEAD_STATUSES.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
