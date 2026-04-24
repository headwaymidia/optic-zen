import { useMemo } from "react";
import { eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Lead } from "@/lib/supabase";

interface Props {
  leads: Lead[];
  from: Date;
  to: Date;
}

export function LeadsVolumeChart({ leads, from, to }: Props) {
  const data = useMemo(() => {
    const days = eachDayOfInterval({ start: from, end: to });
    return days.map((d) => {
      const count = leads.filter((l) => l.created_at && isSameDay(parseISO(l.created_at), d)).length;
      return {
        date: format(d, "dd/MM", { locale: ptBR }),
        weekday: format(d, "EEE", { locale: ptBR }),
        leads: count,
      };
    });
  }, [leads, from, to]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Volume de leads por dia</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [v, "Leads"]}
                labelFormatter={(l, p) => {
                  const wd = (p?.[0]?.payload as any)?.weekday;
                  return wd ? `${l} (${wd})` : l;
                }}
              />
              <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
