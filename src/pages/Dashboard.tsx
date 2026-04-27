import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/useLeads";
import { PeriodFilter, PeriodKey, getPeriodRange } from "@/components/PeriodFilter";
import { SalesRanking } from "@/components/SalesRanking";
import { PeriodKPIRow } from "@/components/PeriodKPIRow";
import { RoiMegaCard } from "@/components/RoiMegaCard";
import { DistributionRow } from "@/components/DistributionRow";
import { LossRankBars } from "@/components/LossRankBars";
import { VerticalNeonFunnel } from "@/components/VerticalNeonFunnel";
import { RevenueEvolutionChart } from "@/components/RevenueEvolutionChart";
import { exportMonthlyReport } from "@/lib/exportReport";
import { isWithinInterval, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown } from "lucide-react";

export default function Dashboard() {
  const { leads, loading } = useLeads();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState<{ from?: Date; to?: Date }>();
  const range = useMemo(() => getPeriodRange(period, custom), [period, custom]);

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.created_at &&
          isWithinInterval(parseISO(l.created_at), { start: range.from, end: range.to })
      ),
    [leads, range]
  );

  const total = filtered.length;
  const periodSummary = `${format(range.from, "dd/MM", { locale: ptBR })} → ${format(range.to, "dd/MM", { locale: ptBR })}`;

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground capitalize">
            {range.label} · {total} leads no período
          </p>
        </div>
        <Button
          onClick={() => exportMonthlyReport(leads)}
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full border-border hover:bg-muted"
          title="Exportar relatório mensal"
          aria-label="Exportar relatório mensal"
        >
          <FileDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter
          value={period}
          customRange={custom}
          onChange={(k, c) => {
            setPeriod(k);
            if (c) setCustom(c);
          }}
        />
        <p className="text-[11px] text-muted-foreground italic font-mono-luxe tabular-nums">
          {periodSummary}
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : (
        <>
          {/* 1. KPI Strip — minimalista, responde ao filtro */}
          <PeriodKPIRow leads={leads} range={range} />

          {/* 2. Mega-Card central — Performance Total (BI) */}
          <RoiMegaCard leads={filtered} />

          {/* 3. Distribuição — Origem (donut 2px) | Motivos de Perda (rank bars) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionRow leads={filtered} />
            <LossRankBars leads={filtered} />
          </div>

          {/* 4. Funil Vertical Neon — pirâmide invertida */}
          <VerticalNeonFunnel leads={filtered} />

          {/* 5. Evolução de Faturamento */}
          <RevenueEvolutionChart leads={leads} />

          {/* 6. Ranking de Vendedores */}
          <SalesRanking leads={filtered} />
        </>
      )}
    </div>
  );
}
