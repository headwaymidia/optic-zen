import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { eachDayOfInterval, format, isSameDay, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const ADS_SOURCES = new Set(["Instagram", "Facebook", "Google Ads", "Meta Ads (Instagram/FB)"]);
const NEON_GREEN = "#22C55E";
const NEON_YELLOW = "#FACC15";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Props {
  leads: Lead[];
}

/**
 * Linha de evolução — Faturamento (linha branca fina + área esmeralda transparente).
 * Acabamento "cockpit" — sem distrações, foco no crescimento.
 */
export function RevenueEvolutionChart({ leads }: Props) {
  const data = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 29), end: today });
    return days.map((d) => {
      const buyersDay = leads.filter(
        (l) =>
          l.status === "Compareceu e Comprou" &&
          isSameDay(parseISO(l.updated_at ?? l.created_at!), d)
      );
      const receita = buyersDay.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
      const adsReceita = buyersDay
        .filter((l) => l.lead_source && ADS_SOURCES.has(String(l.lead_source)))
        .reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
      return {
        date: format(d, "dd MMM", { locale: ptBR }),
        receita,
        ads: adsReceita,
      };
    });
  }, [leads]);

  const total = data.reduce((s, d) => s + d.receita, 0);
  const totalAds = data.reduce((s, d) => s + d.ads, 0);
  const roiRatio = totalAds > 0 ? (total / totalAds).toFixed(2) : "—";

  return (
    <Card className="glass-card rounded-xl border-0 p-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-1.5">
            Evolução de Faturamento
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
            Últimos 30 dias · Receita vs Ads
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-mono-luxe text-xl font-bold tabular-nums tracking-tighter text-foreground leading-none">
              {formatBRL(total)}
            </p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-semibold mt-1.5">
              Receita 30d
            </p>
          </div>
          <div className="text-right">
            <p
              className="font-mono-luxe text-xl font-bold tabular-nums tracking-tighter leading-none neon-glow-yellow"
              style={{ color: NEON_YELLOW }}
            >
              {roiRatio}x
            </p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-semibold mt-1.5">
              ROAS
            </p>
          </div>
        </div>
      </div>

      <div className="h-[260px] w-full -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="revEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NEON_GREEN} stopOpacity={0.55} />
                <stop offset="60%" stopColor={NEON_GREEN} stopOpacity={0.15} />
                <stop offset="100%" stopColor={NEON_GREEN} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="adsEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NEON_YELLOW} stopOpacity={0.10} />
                <stop offset="100%" stopColor={NEON_YELLOW} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "#52525b", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#52525b", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              width={36}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(v: number, name: string) => [
                formatBRL(v),
                name === "receita" ? "Receita" : "Investimento Ads",
              ]}
            />
            <Area
              type="monotone"
              dataKey="ads"
              stroke={NEON_YELLOW}
              strokeOpacity={0.55}
              strokeWidth={1}
              strokeDasharray="3 3"
              fill="url(#adsEvolutionGradient)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="receita"
              stroke={NEON_GREEN}
              strokeWidth={2}
              fill="url(#revEvolutionGradient)"
              dot={false}
              activeDot={{ r: 4, fill: NEON_GREEN, stroke: "#0A0A0A", strokeWidth: 2 }}
              style={{ filter: "drop-shadow(0 0 6px rgba(34,197,94,0.55))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
