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
 * Card de Faturamento — Apple Design System.
 * Tipografia Inter, valor em preto/branco puro, indicadores sutis em cinza.
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
      className="rounded-2xl border bg-white border-zinc-200/80 shadow-sm dark:bg-[#111111] dark:border-[#222222] dark:shadow-none px-7 py-6"
      style={{ fontFamily: "'Inter','Geist Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}
    >
      <div className="flex items-center justify-between gap-10 flex-wrap">
        {/* Esquerda — Valor principal */}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-500 font-medium mb-3">
            Vendas · Faturamento
          </p>
          <p
            className="text-4xl sm:text-5xl font-bold tracking-tighter leading-none tabular-nums text-[#1D1D1F] dark:text-white"
            style={{ fontFeatureSettings: "'tnum','ss01'" }}
          >
            {formatBRL(total)}
          </p>
          <p className="text-[11px] tabular-nums mt-3 text-zinc-500 dark:text-zinc-500 font-medium">
            {salesCount} vendas concluídas
          </p>
        </div>

        {/* Direita — Split Anúncios / Orgânico */}
        <div className="flex-1 max-w-[360px] min-w-[220px] space-y-4">
          {/* Anúncios */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                Anúncios
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-[#1D1D1F] dark:text-white">
                {formatBRL(pago)}
                <span className="ml-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                  {pctPago.toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="h-[2px] w-full rounded-full bg-zinc-100 dark:bg-[#1c1c1c] overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-[#1D1D1F] dark:bg-white"
                style={{ width: `${pctPago}%` }}
              />
            </div>
          </div>

          {/* Orgânico */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                Orgânico
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-[#1D1D1F] dark:text-white">
                {formatBRL(organico)}
                <span className="ml-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                  {pctOrg.toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="h-[2px] w-full rounded-full bg-zinc-100 dark:bg-[#1c1c1c] overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-zinc-400 dark:bg-zinc-600"
                style={{ width: `${pctOrg}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
