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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold">
        <CheckCircle2 className="h-3 w-3" />
        {okLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-100 px-1.5 py-0.5 text-[10px] font-semibold">
      <AlertCircle className="h-3 w-3" />
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

  const itemCls = "flex items-center justify-between gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2";
  const btnCls = "h-8 px-0 text-xs gap-1.5 justify-start font-medium hover:bg-transparent flex-1 min-w-0";

  async function handleSaveNotes() {
    setSavingNotes(true);
    await updateLead(lead.id, { notes: notesDraft });
    setSavingNotes(false);
    toast({ title: "Observações salvas" });
    close();
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className={itemCls}>
          <Button type="button" variant="ghost" onClick={() => setOpen("prescription")} className={btnCls}>
            <Eye className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Receita Oftalmológica</span>
          </Button>
          <StatusBadge ok={prescriptionOk} okLabel="Preenchida" />
        </div>
        <div className={itemCls}>
          <Button type="button" variant="ghost" onClick={() => setOpen("exam")} className={btnCls}>
            <CalendarClock className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Agendar Exame</span>
          </Button>
          <StatusBadge ok={examOk} />
        </div>
        <div className={itemCls}>
          <Button type="button" variant="ghost" onClick={() => setOpen("lab")} className={btnCls}>
            <Package className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Gestão de Pedido</span>
          </Button>
          <StatusBadge ok={labOk} />
        </div>
        <div className={itemCls}>
          <Button type="button" variant="ghost" onClick={() => setOpen("notes")} className={btnCls}>
            <NotebookPen className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Observações</span>
          </Button>
          <StatusBadge ok={notesOk} okLabel="Preenchida" />
        </div>
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
