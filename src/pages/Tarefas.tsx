import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { Lead, LeadStatus } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Clock, RefreshCcw, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Block {
  key: string;
  title: string;
  emoji: string;
  icon: typeof Flame;
  description: string;
  statuses: LeadStatus[];
  cardClass: string;
  badgeClass: string;
  iconClass: string;
}

const BLOCKS: Block[] = [
  {
    key: "quentes",
    title: "Quentes (Agendados)",
    emoji: "🔥",
    icon: Flame,
    description: "Leads que agendaram exame — confirme presença.",
    statuses: ["Agendou Exame"],
    cardClass: "border-l-4 border-l-amber-500",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    iconClass: "text-amber-500",
  },
  {
    key: "atrasados",
    title: "Atrasados",
    emoji: "⏰",
    icon: Clock,
    description: "Leads sem retorno — risco de esfriar.",
    statuses: ["Aguardando Resposta", "Novo Lead"],
    cardClass: "border-l-4 border-l-red-500",
    badgeClass: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    iconClass: "text-red-500",
  },
  {
    key: "oportunidades",
    title: "Oportunidades",
    emoji: "🔄",
    icon: RefreshCcw,
    description: "Repescagem — reaqueça com condição especial.",
    statuses: ["Repescagem"],
    cardClass: "border-l-4 border-l-indigo-500",
    badgeClass: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100",
    iconClass: "text-indigo-500",
  },
];

export default function Tarefas() {
  const { leads, loading } = useLeads();
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    return BLOCKS.map((b) => ({
      ...b,
      items: leads.filter((l) => b.statuses.includes(l.status)),
    }));
  }, [leads]);

  const total = grouped.reduce((sum, g) => sum + g.items.length, 0);

  function handleAtender(lead: Lead) {
    navigate(`/whatsapp?leadId=${lead.id}`);
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
                  <TaskRow key={lead.id} lead={lead} onAtender={handleAtender} />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TaskRow({ lead, onAtender }: { lead: Lead; onAtender: (l: Lead) => void }) {
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
      <Button
        size="sm"
        className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
        onClick={() => onAtender(lead)}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Atender
      </Button>
    </div>
  );
}
