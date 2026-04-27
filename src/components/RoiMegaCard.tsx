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
      className="rounded-2xl border bg-white border-zinc-200/80 shadow-sm dark:bg-[#111111] dark:border-zinc-800 dark:shadow-none px-8 py-10 sm:py-12"
      style={{
        fontFamily:
          "'Inter','Geist Sans',-apple-system,BlinkMacSystemFont,sans-serif",
      }}
    >
      {/* Rótulo discreto */}
      <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500 dark:text-zinc-500 font-medium mb-4">
        Vendas · Faturamento
      </p>

      {/* Valor principal — palco */}
      <p
        className="text-5xl sm:text-6xl font-bold tracking-tighter leading-none tabular-nums text-[#1D1D1F] dark:text-white"
        style={{ fontFeatureSettings: "'tnum','ss01'" }}
      >
        {formatBRL(total)}
      </p>

      {/* Quebra de origem — linha horizontal limpa */}
      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[12px]">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            aria-hidden
          />
          <span className="uppercase tracking-[0.18em] text-zinc-500 font-medium">
            Anúncios
          </span>
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatBRL(pago)}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums font-medium">
            {pctPago.toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"
            aria-hidden
          />
          <span className="uppercase tracking-[0.18em] text-zinc-500 font-medium">
            Orgânico
          </span>
          <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
            {formatBRL(organico)}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums font-medium">
            {pctOrg.toFixed(0)}%
          </span>
        </div>

        <div className="ml-auto text-[10px] uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500 tabular-nums font-medium">
          {salesCount} vendas
        </div>
      </div>

      {/* Barra ultra-fina (2px) */}
      <div className="mt-4 flex h-[2px] w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-[#1c1c1c]">
        <div
          className="h-full rounded-full transition-all bg-emerald-500"
          style={{ width: `${pctPago}%` }}
        />
        <div
          className="h-full rounded-full transition-all bg-zinc-300 dark:bg-zinc-700"
          style={{ width: `${pctOrg}%` }}
        />
      </div>
    </Card>
  );
}
