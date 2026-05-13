import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/integrations/supabase/client";

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
 * Bloco de Faturamento — Coração do Dashboard (Apple Style).
 * Valor gigante + linha horizontal limpa: Anúncios (verde) | Orgânico (cinza).
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

  const pctOrg = 100 - pctPago;

  return (
    <Card
      className="rounded-2xl border bg-white border-zinc-200/80 shadow-sm dark:bg-[#111111] dark:border-zinc-800 dark:shadow-none px-6 py-5 h-full flex flex-col justify-between"
      style={{
        fontFamily:
          "'Inter','Geist Sans',-apple-system,BlinkMacSystemFont,sans-serif",
      }}
    >
      {/* Topo: rótulo + valor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-500 font-medium">
            Vendas · Faturamento
          </p>
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 tabular-nums font-medium">
            {salesCount} vendas
          </span>
        </div>

        <p
          className="text-4xl sm:text-[40px] font-bold tracking-tighter leading-none tabular-nums text-[#1D1D1F] dark:text-white"
          style={{ fontFeatureSettings: "'tnum','ss01'" }}
        >
          {formatBRL(total)}
        </p>
      </div>

      {/* Anúncios vs Orgânico — empilhado, minimalista */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
            <span className="uppercase tracking-[0.16em] text-zinc-500 font-medium">
              Anúncios
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatBRL(pago)}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
              {pctPago.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" aria-hidden />
            <span className="uppercase tracking-[0.16em] text-zinc-500 font-medium">
              Orgânico
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {formatBRL(organico)}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
              {pctOrg.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Barra ultra-fina */}
        <div className="mt-2 flex h-[2px] w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-[#1c1c1c]">
          <div
            className="h-full rounded-full transition-all bg-emerald-500"
            style={{ width: `${pctPago}%` }}
          />
          <div
            className="h-full rounded-full transition-all bg-zinc-300 dark:bg-zinc-700"
            style={{ width: `${pctOrg}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
