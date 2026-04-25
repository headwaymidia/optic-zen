import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { Lead } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOLLOW_UP_INTERVAL_HOURS, MAX_FOLLOW_UPS } from "@/lib/followUpScripts";

// Status que NÃO entram no funil de cadência
const EXCLUDED_STATUSES = new Set([
  "Repescagem",
  "Compareceu e Comprou",
  "Compareceu e Não Comprou",
  "Novo Lead",
  "Agendou Exame",
  "Não Compareceu",
]);

// Cada aba "FU N" filtra leads com follow_up_count = N - 1.
// FU 01 → count 0 (aguardando primeira cobrança)
// FU 05 → count 4 (aguardando última tentativa)
const FU_TABS = [1, 2, 3, 4, 5] as const;
type FuTab = (typeof FU_TABS)[number];
type FilterValue = "all" | `${FuTab}`;

interface CadenceRow {
  lead: Lead;
  pendingFu: FuTab; // qual FU a vendedora precisa enviar agora (1..5)
  hoursLate: number; // horas desde a última interação (referência)
  referenceTs: number;
}

function hoursBetween(fromIso: string | null, now: number): number {
  if (!fromIso) return Number.POSITIVE_INFINITY;
  return (now - new Date(fromIso).getTime()) / (1000 * 60 * 60);
}

function formatLate(hours: number): string {
  if (!isFinite(hours)) return "—";
  if (hours < 1) {
    const m = Math.max(1, Math.round(hours * 60));
    return `${m}min`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function lateToneClass(hours: number): string {
  if (hours > 12) return "text-red-600 dark:text-red-400 font-semibold";
  if (hours >= FOLLOW_UP_INTERVAL_HOURS) return "text-amber-600 dark:text-amber-400 font-medium";
  return "text-muted-foreground";
}

export function CadenceCenter() {
  const { leads, loading } = useLeads();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterValue>("all");

  const rows = useMemo<CadenceRow[]>(() => {
    const now = Date.now();
    const list: CadenceRow[] = [];
    leads.forEach((l) => {
      if (EXCLUDED_STATUSES.has(l.status)) return;
      const count = l.follow_up_count ?? 0;
      // count 0..4 = ainda há FU pendente (1..5). count >= 5 já estourou.
      if (count >= MAX_FOLLOW_UPS) return;

      const pendingFu = (count + 1) as FuTab;
      const refIso = l.last_follow_up_at ?? l.updated_at ?? l.created_at;
      const hours = hoursBetween(refIso, now);

      // Só entra na lista quando já passou a janela de 8h desde a última interação
      if (hours < FOLLOW_UP_INTERVAL_HOURS) return;

      list.push({
        lead: l,
        pendingFu,
        hoursLate: hours,
        referenceTs: refIso ? new Date(refIso).getTime() : 0,
      });
    });
    // Mais atrasados primeiro
    list.sort((a, b) => a.referenceTs - b.referenceTs);
    return list;
  }, [leads]);

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = {
      all: rows.length,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };
    rows.forEach((r) => {
      c[String(r.pendingFu) as FilterValue]++;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => String(r.pendingFu) === filter);
  }, [rows, filter]);

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 bg-background">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
          Central de Cadência
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Selecione uma aba e zere a lista antes de passar para a próxima.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
        <TabsList className="flex-wrap h-auto">
          <TabTriggerWithCount value="all" label="Todos" count={counts.all} />
          {FU_TABS.map((fu) => (
            <TabTriggerWithCount
              key={fu}
              value={String(fu) as FilterValue}
              label={`FU ${String(fu).padStart(2, "0")}`}
              count={counts[String(fu) as FilterValue]}
            />
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[55%]">Nome do Lead</TableHead>
              <TableHead>Tempo de atraso</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-10">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-10">
                  Nenhum lead pendente nesta etapa. ✨
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.lead.id}>
                  <TableCell>
                    <p className="text-sm font-medium truncate">{row.lead.name}</p>
                    {row.lead.phone && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {row.lead.phone}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-sm tabular-nums", lateToneClass(row.hoursLate))}>
                    {formatLate(row.hoursLate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => navigate(`/whatsapp?leadId=${row.lead.id}`)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Abrir Atendimento
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TabTriggerWithCount({
  value,
  label,
  count,
}: {
  value: FilterValue;
  label: string;
  count: number;
}) {
  return (
    <TabsTrigger value={value} className="gap-1.5">
      <span>{label}</span>
      <span
        className={cn(
          "ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          count > 0
            ? "bg-primary/10 text-primary"
            : "bg-muted-foreground/10 text-muted-foreground"
        )}
      >
        {count}
      </span>
    </TabsTrigger>
  );
}
