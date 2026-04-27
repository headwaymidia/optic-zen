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
 * Mega-card central de ROI — text-7xl com gradiente white→zinc-400.
 * Abaixo, barra split (Pago vs Orgânico) com cores semânticas.
 */
export function RoiMegaCard({ leads }: Props) {
  const { total, pago, organico, pctPago } = useMemo(() => {
    const buyers = leads.filter((l) => l.status === "Compareceu e Comprou");
    const total = buyers.reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
    const pago = buyers
      .filter((l) => l.lead_source && PAID_SOURCES.has(String(l.lead_source)))
      .reduce((s, l) => s + (Number(l.sale_value) || 0), 0);
    const organico = total - pago;
    return {
      total,
      pago,
      organico,
      pctPago: total > 0 ? (pago / total) * 100 : 0,
    };
  }, [leads]);

  return (
    <Card className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl p-10 sm:p-12 relative overflow-hidden">
      {/* halo sutil topo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col items-center text-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground font-bold">
          Performance Total · BI
        </p>
        <p
          className="text-6xl sm:text-7xl font-bold tracking-tighter leading-none
                     bg-gradient-to-b from-foreground to-zinc-400 dark:to-zinc-500
                     bg-clip-text text-transparent
                     drop-shadow-[0_2px_24px_rgba(255,255,255,0.06)]"
        >
          {formatBRL(total)}
        </p>
        <p className="text-xs text-muted-foreground font-medium">
          Faturamento consolidado · {leads.filter((l) => l.status === "Compareceu e Comprou").length} vendas
        </p>
      </div>

      {/* Barra split */}
      <div className="mt-10 max-w-2xl mx-auto w-full">
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/50">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${pctPago}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-zinc-300 to-zinc-200 dark:from-zinc-500 dark:to-zinc-400 transition-all"
            style={{ width: `${100 - pctPago}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-4 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground font-medium">Pago</span>
            <span className="font-mono-luxe font-bold tabular-nums text-foreground">
              {formatBRL(pago)}
            </span>
            <span className="text-muted-foreground font-mono-luxe tabular-nums">
              · {pctPago.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <span className="text-muted-foreground font-medium">Orgânico</span>
            <span className="font-mono-luxe font-bold tabular-nums text-foreground">
              {formatBRL(organico)}
            </span>
            <span className="text-muted-foreground font-mono-luxe tabular-nums">
              · {(100 - pctPago).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
