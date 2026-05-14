import { useEffect, useState } from "react";
import { Eye, CalendarClock, Package, AlertCircle, CheckCircle2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { LabOrderForm } from "@/components/LabOrderForm";
import { ExamScheduler } from "@/components/chat/LeadSections";
import { Lead } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import { toast } from "@/components/ui/use-toast";

interface Props {
  lead: Lead;
  onApplyLabScript?: (msg: string) => void;
}

type ActionKey = "prescription" | "exam" | "lab" | "notes" | null;

function StatusBadge({ ok, okLabel = "Ok" }: { ok: boolean; okLabel?: string }) {
  if (ok) {
    return (
      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-primary">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {okLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground">
      <AlertCircle className="h-3 w-3 shrink-0" />
      Pendente
    </span>
  );
}

export function LeadQuickActions({ lead, onApplyLabScript }: Props) {
  const { updateLead } = useLeads();
  const [open, setOpen] = useState<ActionKey>(null);
  const close = () => setOpen(null);

  const [notesDraft, setNotesDraft] = useState(lead.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  useEffect(() => {
    setNotesDraft(lead.notes ?? "");
  }, [lead.id, lead.notes]);

  const p = lead.prescription ?? {};
  const has = (v: unknown) => (typeof v === "string" ? v.trim() !== "" : v != null);
  const prescriptionOk = Boolean(has(p.esferico_od) && has(p.esferico_oe));
  const examOk = !!lead.exam_date;
  const labOk = Boolean(lead.delivery_prediction || lead.lab_status);
  const notesOk = has(lead.notes);

  const actions = [
    { key: "prescription" as const, label: "Receita Oftalmológica", icon: Eye, ok: prescriptionOk, okLabel: "Preenchida" },
    { key: "exam" as const, label: "Agendar Exame", icon: CalendarClock, ok: examOk },
    { key: "lab" as const, label: "Gestão de Pedido", icon: Package, ok: labOk },
    { key: "notes" as const, label: "Observações", icon: NotebookPen, ok: notesOk, okLabel: "Preenchida" },
  ];

  async function handleSaveNotes() {
    setSavingNotes(true);
    await updateLead(lead.id, { notes: notesDraft });
    setSavingNotes(false);
    toast({ title: "Observações salvas" });
    close();
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 overflow-visible">
        {actions.map(({ key, label, icon: Icon, ok, okLabel }) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            onClick={() => setOpen(key)}
            className="h-auto min-h-[76px] w-full min-w-0 flex-col items-start justify-between gap-2 whitespace-normal rounded-md border-border bg-card px-3 py-2.5 text-left hover:bg-accent"
          >
            <span className="flex w-full min-w-0 items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words text-xs font-medium leading-snug text-foreground">{label}</span>
            </span>
            <StatusBadge ok={ok} okLabel={okLabel} />
          </Button>
        ))}
      </div>


      <Sheet open={open === "prescription"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Receita Oftalmológica</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PrescriptionForm lead={lead} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={open === "exam"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Agendar Exame</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ExamScheduler lead={lead} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={open === "lab"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gestão de Pedido / Laboratório</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <LabOrderForm
              lead={lead}
              onApplyScript={(msg) => {
                onApplyLabScript?.(msg);
                close();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={open === "notes"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Observações</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Anote qualquer informação relevante sobre este lead..."
            rows={6}
            className="text-sm resize-y"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
