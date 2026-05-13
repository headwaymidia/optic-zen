import { useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { useStoreMembers } from "@/hooks/useStoreMembers";
import { Lead } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageCircle, User } from "lucide-react";
import { DataSkeleton } from "@/components/ui/DataSkeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  FOLLOW_UP_INTERVAL_HOURS,
  FollowUpLevel,
  getPendingFollowUpLevel,
} from "@/lib/followUpScripts";

// Helpers de data
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function isSameOrBefore(dateStr: string | null, ref: string): boolean {
  if (!dateStr) return false;
  return dateStr.slice(0, 10) <= ref;
}

const CADENCE_STATUSES = ["Em Atendimento", "Aguardando Resposta"] as const;

// Estilo visual por nível de follow-up — escala de calor (azul → vermelho)
const FU_LEVEL_STYLE: Record<FollowUpLevel, { card: string; badge: string; emoji: string; title: string; description: string }> = {
  1: {
    card: "border-l-4 border-l-sky-500",
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
    emoji: "👋",
    title: "Follow-up 1",
    description: "Primeiro lembrete gentil — sem retorno há 8h+.",
  },
  2: {
    card: "border-l-4 border-l-cyan-500",
    badge: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100",
    emoji: "💡",
    title: "Follow-up 2",
    description: "Tirar dúvidas técnicas (lentes/armação).",
  },
  3: {
    card: "border-l-4 border-l-amber-500",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    emoji: "🎯",
    title: "Follow-up 3",
    description: "Proposta de valor / benefício exclusivo.",
  },
  4: {
    card: "border-l-4 border-l-orange-500",
    badge: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
    emoji: "🌟",
    title: "Follow-up 4",
    description: "Prova social — depoimento de cliente.",
  },
  5: {
    card: "border-l-4 border-l-red-500",
    badge: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    emoji: "🏁",
    title: "Follow-up 5 — Última tentativa",
    description: "Despedida educada antes de mover p/ Repescagem.",
  },
};

export default function Tarefas() {
  usePageTitle("Tarefas de Hoje");
  const { leads, loading, updateLead } = useLeads();
  const navigate = useNavigate();
  const today = todayISO();

  // Bloco "Quentes": exames agendados para hoje (ou em atraso) — usa exam_date primariamente
  const quentes = useMemo(
    () =>
      leads.filter((l) => {
        if (l.status !== "Agendou Exame") return false;
        const ref = l.exam_date ?? l.follow_up_date;
        return isSameOrBefore(ref, today);
      }),
    [leads, today]
  );

  // Bloco "Oportunidades": repescagem com follow_up_date marcado para hoje
  const oportunidades = useMemo(
    () =>
      leads.filter(
        (l) => l.status === "Repescagem" && (l.follow_up_date ?? "").slice(0, 10) === today
      ),
    [leads, today]
  );

  // Cadência: agrupar por nível pendente (1..5)
  const cadenceGroups = useMemo(() => {
    const map: Record<FollowUpLevel, Lead[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    leads.forEach((l) => {
      if (!CADENCE_STATUSES.includes(l.status as typeof CADENCE_STATUSES[number])) return;
      // Se foi adiado pra frente, não aparece hoje
      if (l.follow_up_date && l.follow_up_date.slice(0, 10) > today) return;
      const level = getPendingFollowUpLevel(
        l.follow_up_count ?? 0,
        l.last_follow_up_at ?? null,
        l.updated_at || l.created_at
      );
      if (level) map[level].push(l);
    });
    return map;
  }, [leads, today]);

  const cadenceTotal =
    cadenceGroups[1].length +
    cadenceGroups[2].length +
    cadenceGroups[3].length +
    cadenceGroups[4].length +
    cadenceGroups[5].length;

  const total = quentes.length + oportunidades.length + cadenceTotal;

  function handleAtender(lead: Lead) {
    navigate(`/whatsapp?leadId=${lead.id}`);
  }

  async function handleSnooze(lead: Lead, days: number, label: string) {
    const newDate = addDaysISO(days);
    await updateLead(lead.id, { follow_up_date: newDate });
    toast({ title: "Adiado", description: `${lead.name} reaparece ${label}.` });
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Tarefas de Hoje</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {loading ? "\u00A0" : `${total} leads precisam da sua atenção hoje.`}
        </p>
      </div>

      {loading && leads.length === 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              <DataSkeleton variant="row" className="[&>div]:h-5 [&>div]:w-1/2" />
              <DataSkeleton variant="card" count={3} className="[&>div]:h-16" />
            </div>
          ))}
        </div>
      ) : (
      <>
      {/* Quentes & Oportunidades */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-lg">🔥</span>
                <span>Quentes (Agendados)</span>
              </span>
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
              >
                {quentes.length}
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Exames agendados para hoje (ou em atraso). Confirme presença.
            </p>
          </CardHeader>
          <CardContent className="flex-1 space-y-2">
            {quentes.length === 0 ? (
              <EmptyMsg />
            ) : (
              quentes.map((l) => (
                <TaskRow key={l.id} lead={l} onAtender={handleAtender} onSnooze={handleSnooze} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col border-l-4 border-l-indigo-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-lg">🔄</span>
                <span>Oportunidades (Repescagem)</span>
              </span>
              <Badge
                variant="secondary"
                className="bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100"
              >
                {oportunidades.length}
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">Repescagem agendada para hoje.</p>
          </CardHeader>
          <CardContent className="flex-1 space-y-2">
            {oportunidades.length === 0 ? (
              <EmptyMsg />
            ) : (
              oportunidades.map((l) => (
                <TaskRow key={l.id} lead={l} onAtender={handleAtender} onSnooze={handleSnooze} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cadência de Vendas — 5 tentativas */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Cadência de Follow-up</h2>
            <p className="text-[11px] text-muted-foreground">
              Sequência de {FOLLOW_UP_INTERVAL_HOURS}h entre tentativas — não deixe nenhum lead esfriar.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {cadenceTotal} pendentes
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {([1, 2, 3, 4, 5] as FollowUpLevel[]).map((level) => {
            const style = FU_LEVEL_STYLE[level];
            const items = cadenceGroups[level];
            return (
              <Card key={level} className={cn("flex flex-col", style.card)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="text-base">{style.emoji}</span>
                      <span className="truncate">{style.title}</span>
                    </span>
                    <Badge variant="secondary" className={style.badge}>
                      {items.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">{style.description}</p>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {items.length === 0 ? (
                    <EmptyMsg />
                  ) : (
                    items.map((l) => (
                      <TaskRow
                        key={l.id}
                        lead={l}
                        onAtender={handleAtender}
                        onSnooze={handleSnooze}
                        compact
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function EmptyMsg() {
  return (
    <p className="text-xs text-muted-foreground py-6 text-center">
      Nada por aqui. Bom trabalho! ✨
    </p>
  );
}

function TaskRow({
  lead,
  onAtender,
  onSnooze,
  compact,
}: {
  lead: Lead;
  onAtender: (l: Lead) => void;
  onSnooze: (l: Lead, days: number, label: string) => void;
  compact?: boolean;
}) {
  const { nameById } = useStoreMembers();
  const sellerName = lead.responsible_id ? nameById.get(lead.responsible_id) : null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-card p-2.5 hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{lead.name}</p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {lead.phone && <span className="truncate">{lead.phone}</span>}
          {sellerName && (
            <span className="inline-flex items-center gap-0.5 text-primary">
              <User className="h-3 w-3" />
              {sellerName}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => onAtender(lead)}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {compact ? "" : "Atender"}
        </Button>
        {!compact && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                aria-label="Adiar"
              >
                <Clock className="h-3.5 w-3.5" />
                Adiar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onSnooze(lead, 1, "amanhã")}>
                Para amanhã
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(lead, 7, "na semana que vem")}>
                Para semana que vem
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
