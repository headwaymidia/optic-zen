import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";

interface Props {
  leads: Lead[];
}

const PAID_SOURCES = new Set([
  "Instagram",
  "Facebook",
  "Google Ads",
  "Meta Ads (Instagram/FB)",
]);

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/**
 * Mega-Card de Faturamento — Dashpro Neon.
 * R$ GIGANTE em verde neon brilhante + barra split Pago vs Orgânico.
 */
export function RoiMegaCard({ leads }: Props) {
  const { total, pago, organico, pctPago, salesCount } = useMemo(() => {
    const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
    const total = buyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
    const pago = buyers
      .filter((l) => l.lead_source && PAID_SOURCES.has(String(l.lead_source)))
      .reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
    return {
      total,
      pago,
      organico: total - pago,
      pctPago: total > 0 ? (pago / total) * 100 : 0,
      salesCount: buyers.length,
    };
  }, [leads]);

  return (
    <Card className="glass-card rounded-2xl p-10 sm:p-12 relative overflow-hidden">
      {/* halo neon verde no fundo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(34,197,94,0.10) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col items-center text-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500 font-bold">
          Faturamento Total · BI
        </p>
        <p
          className="font-mono-luxe text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter leading-none neon-glow-green tabular-nums"
          style={{ color: "#22C55E" }}
        >
          {formatBRL(total)}
        </p>
        <p className="text-xs text-zinc-500 font-medium font-mono-luxe tabular-nums">
          {salesCount} vendas concluídas
        </p>
      </div>

      {/* Barra split */}
      <div className="relative mt-10 max-w-2xl mx-auto w-full">
        <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[#1a1a1a]">
          <div
            className="h-full transition-all"
            style={{
              width: `${pctPago}%`,
              background: "linear-gradient(90deg, #22C55E 0%, #4ADE80 100%)",
              boxShadow: "0 0 12px rgba(34,197,94,0.6)",
            }}
          />
          <div
            className="h-full bg-zinc-700 transition-all"
            style={{ width: `${100 - pctPago}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-4 text-[11px]">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "#22C55E", boxShadow: "0 0 8px #22C55E" }}
            />
            <span className="text-zinc-400 font-medium">Pago</span>
            <span className="font-mono-luxe font-bold tabular-nums text-foreground">
              {formatBRL(pago)}
            </span>
            <span className="text-zinc-500 font-mono-luxe tabular-nums">
              · {pctPago.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-500" />
            <span className="text-zinc-400 font-medium">Orgânico</span>
            <span className="font-mono-luxe font-bold tabular-nums text-foreground">
              {formatBRL(organico)}
            </span>
            <span className="text-zinc-500 font-mono-luxe tabular-nums">
              · {(100 - pctPago).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
