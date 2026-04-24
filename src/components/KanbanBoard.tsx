import { useState } from "react";
import { LEAD_STATUSES, Lead, LeadStatus, SALESPEOPLE } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, MessageCircle, Pencil, Flame, Tag, User, CalendarClock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadDialog } from "./LeadDialog";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

const STATUS_COLORS: Record<LeadStatus, string> = {
  "Novo Lead": "bg-blue-500",
  "Aguardando Resposta": "bg-amber-500",
  "Agendou Exame": "bg-purple-500",
  "Não Compareceu": "bg-orange-500",
  "Compareceu e Comprou": "bg-emerald-500",
  "Compareceu e Não Comprou": "bg-rose-500",
  Repescagem: "bg-indigo-500",
};

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Alta: "destructive",
  Média: "default",
  Baixa: "secondary",
};

// Tailwind classes per interest tag (uses light/dark friendly tones)
const INTEREST_TAG_STYLES: Record<string, string> = {
  Exame: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Multifocal: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  Solar: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "Lentes de Contato": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  Armação: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  Infantil: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
};

const SOURCE_EMOJI: Record<string, string> = {
  Instagram: "📸",
  "Google Ads": "🔎",
  WhatsApp: "💬",
  Indicação: "🤝",
  Facebook: "👍",
  "Loja Física": "🏬",
  Outro: "🔗",
};

const COOLING_STATUSES: LeadStatus[] = ["Novo Lead", "Aguardando Resposta"];
const COOLING_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2h

function isCooling(lead: Lead): boolean {
  if (!COOLING_STATUSES.includes(lead.status)) return false;
  const created = new Date(lead.created_at).getTime();
  return Date.now() - created > COOLING_THRESHOLD_MS;
}

function formatPhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  if (local.length === 9) return `${local.slice(0, 5)}-${local.slice(5)}`;
  if (local.length === 8) return `${local.slice(0, 4)}-${local.slice(4)}`;
  return phone;
}

function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) digits = "55" + digits;
  return `https://api.whatsapp.com/send?phone=${digits}`;
}

interface LeadCardProps {
  lead: Lead;
  onEdit: (l: Lead) => void;
  onSelect?: (l: Lead) => void;
  dragging?: boolean;
  selected?: boolean;
}

function LeadCardContent({ lead, onEdit, dragging, selected }: LeadCardProps) {
  const { updateLead } = useLeads();
  const cooling = isCooling(lead);
  return (
    <Card
      className={cn(
        "p-3 select-none bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.08)] hover:shadow-[0_8px_24px_-6px_rgba(6,81,237,0.12)] transition-all duration-300 relative overflow-hidden border-0",
        cooling && "ring-1 ring-red-500/50 animate-pulse-border",
        dragging && "shadow-xl ring-2 ring-primary/30 rotate-1 scale-[1.02]",
        selected && !dragging && "ring-2 ring-primary shadow-[0_8px_24px_-6px_rgba(6,81,237,0.15)]"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 truncate flex-1 leading-tight">{lead.name}</p>
          <div className="flex items-center gap-1 shrink-0">
            {lead.priority && (
              <Badge
                variant={PRIORITY_VARIANT[lead.priority] ?? "outline"}
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              >
                {lead.priority}
              </Badge>
            )}
            {lead.lead_source && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
                title={`Origem: ${lead.lead_source}`}
              >
                <span aria-hidden>{SOURCE_EMOJI[lead.lead_source as string] ?? "🔗"}</span>
              </span>
            )}
            {lead.assigned_to && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5"
                title={`Vendedora: ${lead.assigned_to}`}
              >
                <User className="h-2.5 w-2.5" />
                {lead.assigned_to}
              </span>
            )}
          </div>
        </div>
        {lead.phone && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {formatPhoneBR(lead.phone)}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {lead.interest_tag && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide",
                INTEREST_TAG_STYLES[lead.interest_tag as string] ??
                  "bg-slate-100 text-slate-700"
              )}
            >
              <Tag className="h-2.5 w-2.5" />
              {lead.interest_tag}
            </span>
          )}
          {cooling && (
            <Badge className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] px-2 py-0.5 gap-1 rounded-full border-0 font-semibold">
              <Flame className="h-3 w-3" />
              ESFRIANDO
            </Badge>
          )}
          {lead.status === "Repescagem" && (
            <Badge className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full border-0 font-semibold">
              Repescagem
            </Badge>
          )}
          {lead.status === "Compareceu e Comprou" && lead.sale_value ? (
            <Badge className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full border-0 font-semibold">
              {Number(lead.sale_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </Badge>
          ) : null}
          {lead.delivery_prediction && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 text-[10px] font-medium px-2 py-0.5"
              title={`Previsão de entrega${lead.lab_status ? ` · ${lead.lab_status}` : ""}`}
            >
              <CalendarClock className="h-2.5 w-2.5" />
              {new Date(lead.delivery_prediction + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </div>
        <div
          className="pt-1"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Select
            value={lead.assigned_to || "__none__"}
            onValueChange={(v) =>
              updateLead(lead.id, { assigned_to: v === "__none__" ? null : v })
            }
          >
            <SelectTrigger className="h-7 w-full text-[11px]">
              <SelectValue placeholder="Atribuir vendedora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">— Sem vendedora —</SelectItem>
              {SALESPEOPLE.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-1 pt-1">
          {lead.phone ? (
            <Button
              type="button"
              size="sm"
              className="h-9 flex-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 md:flex-initial md:h-7 md:w-7 md:p-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                window.open(whatsappUrl(lead.phone!), "_blank");
              }}
              aria-label="Abrir WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="md:hidden">WhatsApp</span>
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 md:h-7 md:w-7 rounded-full"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lead);
            }}
            aria-label="Editar lead"
          >
            <Pencil className="h-4 w-4 md:h-3.5 md:w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DraggableLeadCard({ lead, onEdit, onSelect, selected }: { lead: Lead; onEdit: (l: Lead) => void; onSelect?: (l: Lead) => void; selected?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect?.(lead)}
      className={cn("touch-none cursor-pointer active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <LeadCardContent lead={lead} onEdit={onEdit} selected={selected} />
    </div>
  );
}

function DroppableColumn({
  status,
  count,
  children,
  onAdd,
}: {
  status: LeadStatus;
  count: number;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 snap-start flex-col rounded-2xl bg-slate-50/70 border border-slate-100 transition-colors",
        isOver && "bg-slate-100 ring-2 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100/60 p-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_COLORS[status])} />
          <h3 className="truncate text-sm font-bold tracking-wide text-slate-800">{status}</h3>
          <span className="text-xs font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded-full shadow-sm">{count}</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white hover:shadow-sm rounded-lg" onClick={onAdd}>
          <Plus className="h-4 w-4 text-slate-500" />
        </Button>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[200px]">{children}</div>
    </div>
  );
}

export function KanbanBoard({ onSelectLead, selectedLeadId }: { onSelectLead?: (l: Lead) => void; selectedLeadId?: string | null } = {}) {
  const { leads, loading, refetch, updateStatus } = useLeads();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>("Novo Lead");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  function openNew(status: LeadStatus) {
    setEditingLead(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setDialogOpen(true);
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId || typeof overId !== "string" || !overId.startsWith("col-")) return;
    const newStatus = overId.slice(4) as LeadStatus;
    await updateStatus(String(e.active.id), newStatus);
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando leads...</div>;
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div
          className="flex gap-4 overflow-x-auto px-4 pb-8 snap-x snap-mandatory md:snap-none scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {LEAD_STATUSES.map((status) => {
            const colLeads = leads.filter((l) => l.status === status);
            return (
              <DroppableColumn
                key={status}
                status={status}
                count={colLeads.length}
                onAdd={() => openNew(status)}
              >
                {colLeads.map((lead) => (
                  <DraggableLeadCard
                    key={lead.id}
                    lead={lead}
                    onEdit={openEdit}
                    onSelect={onSelectLead}
                    selected={selectedLeadId === lead.id}
                  />
                ))}
                {colLeads.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Nenhum lead
                  </p>
                )}
              </DroppableColumn>
            );
          })}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeLead ? <LeadCardContent lead={activeLead} onEdit={() => {}} dragging /> : null}
        </DragOverlay>
      </DndContext>
      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editingLead}
        defaultStatus={defaultStatus}
        onSaved={refetch}
      />
    </>
  );
}
