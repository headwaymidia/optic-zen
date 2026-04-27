import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Lead } from "@/lib/supabase";
import { Megaphone, Sprout } from "lucide-react";

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
 * Card de Faturamento — versão COMPACTA.
 * Valor em destaque + split Pago/Orgânico em barra fina.
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
    <Card className="glass-card rounded-xl border border-border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Valor principal */}
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-bold mb-1">
            Vendas (Faturamento)
          </p>
          <p className="font-mono-luxe text-3xl sm:text-4xl font-bold tracking-tighter leading-none tabular-nums text-emerald-600 dark:text-[#22C55E] dark:[text-shadow:0_0_14px_rgba(34,197,94,0.45)]">
            {formatBRL(total)}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono-luxe tabular-nums mt-1.5">
            {salesCount} vendas concluídas
          </p>
        </div>

        {/* Split Pago/Orgânico — direita */}
        <div className="flex-1 max-w-[320px] min-w-[180px]">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-foreground/80">
              <Megaphone className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              Anúncios
            </span>
            <span className="font-mono-luxe tabular-nums font-bold text-foreground">
              {formatBRL(pago)}
              <span className="text-muted-foreground font-medium ml-1">
                · {pctPago.toFixed(0)}%
              </span>
            </span>
          </div>

          {/* barra fina */}
          <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted">
            <div
              className="h-full transition-all"
              style={{
                width: `${pctPago}%`,
                background: "linear-gradient(90deg,#22C55E,#4ADE80)",
                boxShadow: "0 0 8px rgba(34,197,94,0.55)",
              }}
            />
            <div
              className="h-full bg-slate-400/70 dark:bg-zinc-600 transition-all"
              style={{ width: `${pctOrg}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] mt-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-foreground/80">
              <Sprout className="h-3 w-3 text-slate-500 dark:text-zinc-400" />
              Orgânico
            </span>
            <span className="font-mono-luxe tabular-nums font-bold text-foreground">
              {formatBRL(organico)}
              <span className="text-muted-foreground font-medium ml-1">
                · {pctOrg.toFixed(0)}%
              </span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
