import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { Lead } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Clock, RefreshCcw, MessageCircle, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Helpers de data — comparações em UTC date string (YYYY-MM-DD)
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
function hoursSince(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

interface BlockDef {
  key: string;
  title: string;
  emoji: string;
  description: string;
  cardClass: string;
  badgeClass: string;
  filter: (l: Lead, today: string) => boolean;
}

const BLOCKS: BlockDef[] = [
  {
    key: "quentes",
    title: "Quentes (Agendados)",
    emoji: "🔥",
    description: "Exames agendados para hoje (ou em atraso). Confirme presença.",
    cardClass: "border-l-4 border-l-amber-500",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    filter: (l, today) =>
      l.status === "Agendou Exame" && isSameOrBefore(l.follow_up_date, today),
  },
  {
    key: "atrasados",
    title: "Atrasados",
    emoji: "⏰",
    description: "Sem retorno há mais de 24h e sem adiamento futuro.",
    cardClass: "border-l-4 border-l-red-500",
    badgeClass: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    filter: (l, today) => {
      if (l.status !== "Novo Lead" && l.status !== "Aguardando Resposta") return false;
      const stale = hoursSince(l.updated_at || l.created_at) >= 24;
      const notSnoozed = !l.follow_up_date || l.follow_up_date.slice(0, 10) <= today;
      return stale && notSnoozed;
    },
  },
  {
    key: "oportunidades",
    title: "Oportunidades",
    emoji: "🔄",
    description: "Repescagem agendada para hoje.",
    cardClass: "border-l-4 border-l-indigo-500",
    badgeClass: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100",
    filter: (l, today) =>
      l.status === "Repescagem" && (l.follow_up_date ?? "").slice(0, 10) === today,
  },
];

export default function Tarefas() {
  const { leads, loading, updateLead } = useLeads();
  const navigate = useNavigate();

  const today = todayISO();

  const grouped = useMemo(
    () => BLOCKS.map((b) => ({ ...b, items: leads.filter((l) => b.filter(l, today)) })),
    [leads, today]
  );

  const total = grouped.reduce((sum, g) => sum + g.items.length, 0);

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
          {loading ? "Carregando..." : `${total} leads precisam da sua atenção hoje.`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {grouped.map((block) => (
          <Card key={block.key} className={cn("flex flex-col", block.cardClass)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-lg">{block.emoji}</span>
                  <span>{block.title}</span>
                </span>
                <Badge variant="secondary" className={block.badgeClass}>
                  {block.items.length}
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">{block.description}</p>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              {block.items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Nada por aqui. Bom trabalho! ✨
                </p>
              ) : (
                block.items.map((lead) => (
                  <TaskRow
                    key={lead.id}
                    lead={lead}
                    onAtender={handleAtender}
                    onSnooze={handleSnooze}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  lead,
  onAtender,
  onSnooze,
}: {
  lead: Lead;
  onAtender: (l: Lead) => void;
  onSnooze: (l: Lead, days: number, label: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-card p-2.5 hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{lead.name}</p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {lead.phone && <span className="truncate">{lead.phone}</span>}
          {lead.assigned_to && (
            <span className="inline-flex items-center gap-0.5 text-primary">
              <User className="h-3 w-3" />
              {lead.assigned_to}
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
          Atender
        </Button>
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
      </div>
    </div>
  );
}
