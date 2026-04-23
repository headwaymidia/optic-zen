import { useEffect, useState } from "react";
import { LEAD_STATUSES, Lead, LeadStatus, supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, GripVertical } from "lucide-react";
import { LeadDialog } from "./LeadDialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

export function KanbanBoard() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>("Novo Lead");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<LeadStatus | null>(null);

  async function fetchLeads() {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar leads", description: error.message, variant: "destructive" });
      return;
    }
    setLeads((data ?? []) as Lead[]);
  }

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.company_id]);

  function openNew(status: LeadStatus) {
    setEditingLead(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setDialogOpen(true);
  }

  async function moveLead(leadId: string, newStatus: LeadStatus) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId);
    if (error) {
      toast({ title: "Erro ao mover lead", description: error.message, variant: "destructive" });
      fetchLeads();
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando leads...</div>;
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto p-4 pb-8">
        {LEAD_STATUSES.map((status) => {
          const colLeads = leads.filter((l) => l.status === status);
          return (
            <div
              key={status}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg bg-muted/40 transition-colors",
                dragOverCol === status && "bg-muted ring-2 ring-primary/40"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(status);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === status ? null : c))}
              onDrop={() => {
                setDragOverCol(null);
                if (draggedId) moveLead(draggedId, status);
                setDraggedId(null);
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_COLORS[status])} />
                  <h3 className="truncate text-sm font-semibold">{status}</h3>
                  <span className="text-xs text-muted-foreground">{colLeads.length}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openNew(status)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-2 p-2 min-h-[200px]">
                {colLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedId(lead.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onClick={() => openEdit(lead)}
                    className="group cursor-pointer p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 opacity-0 group-hover:opacity-100" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">{lead.name}</p>
                          {lead.priority && (
                            <Badge variant={PRIORITY_VARIANT[lead.priority] ?? "outline"} className="shrink-0 text-[10px] px-1.5 py-0">
                              {lead.priority}
                            </Badge>
                          )}
                        </div>
                        {lead.phone && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </p>
                        )}
                        {lead.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{lead.notes}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {colLeads.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhum lead</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editingLead}
        defaultStatus={defaultStatus}
        onSaved={fetchLeads}
      />
    </>
  );
}
