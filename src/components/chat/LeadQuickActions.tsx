import { useState } from "react";
import { Eye, CalendarClock, Package } from "lucide-react";
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

export function LeadQuickActions({ lead, onApplyLabScript }: Props) {
  const [open, setOpen] = useState<ActionKey>(null);

  const close = () => setOpen(null);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen("prescription")}
          className="h-7 px-2.5 text-[11px] gap-1.5"
        >
          <Eye className="h-3.5 w-3.5 text-primary" />
          Receita Oftalmológica
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen("exam")}
          className="h-7 px-2.5 text-[11px] gap-1.5"
        >
          <CalendarClock className="h-3.5 w-3.5 text-primary" />
          Agendar Exame
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen("lab")}
          className="h-7 px-2.5 text-[11px] gap-1.5"
        >
          <Package className="h-3.5 w-3.5 text-primary" />
          Gestão de Pedido / Laboratório
        </Button>
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
