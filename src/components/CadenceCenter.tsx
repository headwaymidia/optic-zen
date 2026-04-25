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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FOLLOW_UP_INTERVAL_HOURS,
  FollowUpLevel,
  MAX_FOLLOW_UPS,
} from "@/lib/followUpScripts";

const EXCLUDED_STATUSES = new Set(["Repescagem", "Compareceu e Comprou"]);

const SOURCE_EMOJI: Record<string, string> = {
  Instagram: "📸",
  "Google Ads": "🔎",
  WhatsApp: "💬",
  Indicação: "🤝",
  Facebook: "👍",
  "Loja Física": "🏬",
  Outro: "🔗",
};

// Origem orgânica vs paga (para o ícone Ads/Orgânico)
const PAID_SOURCES = new Set(["Google Ads", "Facebook", "Instagram"]);

const FU_STYLE: Record<FollowUpLevel, string> = {
  1: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100 border-transparent",
  2: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100 border-transparent",
  3: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 border-transparent",
  4: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100 border-transparent",
  5: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100 border-transparent",
};

interface CadenceRow {
  lead: Lead;
  level: FollowUpLevel; // etapa atual = follow_up_count (1..5)
  hoursSince: number; // horas desde last_follow_up_at (ou updated_at)
  referenceTs: number; // timestamp da última interação (para ordenação)
}

function hoursBetween(fromIso: string | null, now: number): number {
  if (!fromIso) return Number.POSITIVE_INFINITY;
  return (now - new Date(fromIso).getTime()) / (1000 * 60 * 60);
}

function formatRelative(hours: number): string {
  if (!isFinite(hours)) return "—";
  if (hours < 1) {
    const m = Math.max(1, Math.round(hours * 60));
    return `há ${m}min`;
  }
  if (hours < 24) return `há ${Math.round(hours)}h`;
  const d = Math.round(hours / 24);
  return `há ${d}d`;
}

type TimeStatus = "ok" | "warn" | "late";
function timeStatus(hours: number): TimeStatus {
  if (hours < FOLLOW_UP_INTERVAL_HOURS) return "ok";
  if (hours <= 12) return "warn";
  return "late";
}

const TIME_STATUS_LABEL: Record<TimeStatus, string> = {
  ok: "Dentro do prazo (< 8h)",
  warn: "Atenção (8h–12h)",
  late: "Atrasado (> 12h)",
};

const TIME_STATUS_DOT: Record<TimeStatus, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  late: "bg-red-500",
};

type FilterValue = "all" | "1" | "2" | "3" | "4" | "5";

export function CadenceCenter() {
  const { leads, loading } = useLeads();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterValue>("all");

  const rows = useMemo<CadenceRow[]>(() => {
    const now = Date.now();
    const list: CadenceRow[] = [];
    leads.forEach((l) => {
      const count = l.follow_up_count ?? 0;
      if (count <= 0) return;
      if (count > MAX_FOLLOW_UPS) return;
      if (EXCLUDED_STATUSES.has(l.status)) return;
      const refIso = l.last_follow_up_at ?? l.updated_at ?? l.created_at;
      const hours = hoursBetween(refIso, now);
      list.push({
        lead: l,
        level: count as FollowUpLevel,
        hoursSince: hours,
        referenceTs: refIso ? new Date(refIso).getTime() : 0,
      });
    });
    // Ordena: mais antigos (maior tempo sem follow-up) primeiro
    list.sort((a, b) => a.referenceTs - b.referenceTs);
    return list;
  }, [leads]);

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = { all: rows.length, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    rows.forEach((r) => {
      c[String(r.level) as FilterValue]++;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => String(r.level) === filter);
  }, [rows, filter]);

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 bg-background">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
          Central de Cadência
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Todos os leads dentro do ciclo de {MAX_FOLLOW_UPS} follow-ups, ordenados pelos mais antigos.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all" className="gap-1.5">
            Ver Todos
            <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-[10px] font-semibold">
              {counts.all}
            </span>
          </TabsTrigger>
          {([1, 2, 3, 4, 5] as FollowUpLevel[]).map((lvl) => (
            <TabsTrigger key={lvl} value={String(lvl)} className="gap-1.5">
              Pendente FU {lvl}
              <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-[10px] font-semibold">
                {counts[String(lvl) as FilterValue]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[40%]">Lead</TableHead>
              <TableHead>Etapa Atual</TableHead>
              <TableHead>Última Interação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                  Nenhum lead nesta etapa. ✨
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const status = timeStatus(row.hoursSince);
                const source = (row.lead.lead_source as string) ?? "";
                const isPaid = PAID_SOURCES.has(source);
                return (
                  <TableRow key={row.lead.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              aria-hidden
                              className={cn(
                                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                                isPaid
                                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                              )}
                            >
                              {SOURCE_EMOJI[source] ?? (isPaid ? "💰" : "🌱")}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {source ? `${isPaid ? "Ads" : "Orgânico"} · ${source}` : (isPaid ? "Ads" : "Orgânico")}
                          </TooltipContent>
                        </Tooltip>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{row.lead.name}</p>
                          {row.lead.phone && (
                            <p className="text-[11px] text-muted-foreground truncate">{row.lead.phone}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-semibold", FU_STYLE[row.level])}>
                        FU {row.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatRelative(row.hoursSince)}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full ring-2 ring-background",
                                TIME_STATUS_DOT[status]
                              )}
                              aria-hidden
                            />
                            <span className="hidden sm:inline">{TIME_STATUS_LABEL[status]}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{TIME_STATUS_LABEL[status]}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => navigate(`/whatsapp?leadId=${row.lead.id}`)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Abrir Chat
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
