import { useState } from "react";
import { Eye, CalendarClock, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { LabOrderForm } from "@/components/LabOrderForm";
import { ExamScheduler } from "@/components/chat/LeadSections";
import { Lead } from "@/integrations/supabase/client";

interface Props {
  lead: Lead;
  onApplyLabScript?: (msg: string) => void;
}

type ActionKey = "prescription" | "exam" | "lab" | null;

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
  const [open, setOpen] = useState<ActionKey>(null);
  const close = () => setOpen(null);

  const p = lead.prescription ?? {};
  const has = (v: unknown) => (typeof v === "string" ? v.trim() !== "" : v != null);
  const prescriptionOk = Boolean(has(p.esferico_od) && has(p.esferico_oe));
  const examOk = !!lead.exam_date;
  const labOk = Boolean(lead.delivery_prediction || lead.lab_status);

  const itemCls = "inline-flex items-center gap-1.5 shrink-0";
  const btnCls = "h-7 px-2.5 text-[11px] gap-1.5 justify-start";

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap justify-start">
        <div className={itemCls}>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen("prescription")} className={btnCls}>
            <Eye className="h-3.5 w-3.5 text-primary" />
            Receita Oftalmológica
          </Button>
          <StatusBadge ok={prescriptionOk} okLabel="Preenchida" />
        </div>
        <div className={itemCls}>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen("exam")} className={btnCls}>
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            Agendar Exame
          </Button>
          <StatusBadge ok={examOk} />
        </div>
        <div className={itemCls}>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen("lab")} className={btnCls}>
            <Package className="h-3.5 w-3.5 text-primary" />
            Gestão de Pedido / Laboratório
          </Button>
          <StatusBadge ok={labOk} />
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
    </>
  );
}
