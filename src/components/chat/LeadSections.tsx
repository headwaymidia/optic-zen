import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Eye,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { LabOrderForm } from "@/components/LabOrderForm";
import { useLeads } from "@/hooks/useLeads";
import { Lead } from "@/lib/supabase";

interface Props {
  lead: Lead;
  onApplyLabScript: (msg: string) => void;
}

export function LeadSections({ lead, onApplyLabScript }: Props) {
  const { updateLead } = useLeads();
  const p = lead.prescription ?? {};
  const has = (v: unknown) => typeof v === "string" ? v.trim() !== "" : v != null;
  const prescriptionOk = Boolean(
    has(p.esferico_od) && has(p.cilindrico_od) && has(p.eixo_od) &&
    has(p.esferico_oe) && has(p.cilindrico_oe) && has(p.eixo_oe)
  );
  const labOk = Boolean(lead.delivery_prediction || lead.lab_status);

  return (
    <>
      <Accordion key={lead.id} type="single" collapsible className="border-b bg-card/50">
        <AccordionItem value="prescription" className="border-0 border-b">
          <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline hover:bg-muted/50">
            <span className="flex items-center gap-2 flex-1 text-left">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Receita Oftalmológica</span>
              <ChecklistBadge ok={prescriptionOk} okLabel="Preenchida" />
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0">
            <PrescriptionForm lead={lead} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="exam" className="border-0 border-b">
          <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline hover:bg-muted/50">
            <span className="flex items-center gap-2 flex-1 text-left">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              <span>Agendar Exame</span>
              <ChecklistBadge ok={!!lead.exam_date} />
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0">
            <ExamScheduler lead={lead} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="lab" className="border-0">
          <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline hover:bg-muted/50">
            <span className="flex items-center gap-2 flex-1 text-left">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              <span>Gestão de Pedido / Laboratório</span>
              <ChecklistBadge ok={labOk} />
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0">
            <LabOrderForm lead={lead} onApplyScript={onApplyLabScript} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <LeadNotesSection lead={lead} updateLead={updateLead} />
    </>
  );
}

function ChecklistBadge({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
        <CheckCircle2 className="h-3 w-3" />
        Ok
      </span>
    );
  }
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-100 px-2 py-0.5 text-[10px] font-semibold">
      <AlertCircle className="h-3 w-3" />
      Pendente
    </span>
  );
}

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ExamScheduler({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads();
  const [value, setValue] = useState<string>(toLocalInputValue(lead.exam_date));
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!value) {
      toast({ title: "Selecione data e hora", variant: "destructive" });
      return;
    }
    setSaving(true);
    const iso = new Date(value).toISOString();
    await updateLead(lead.id, { exam_date: iso, status: "Agendou Exame" });
    setSaving(false);
    toast({ title: `Exame agendado para ${new Date(iso).toLocaleString("pt-BR")}!` });
  }

  async function handleClear() {
    setValue("");
    await updateLead(lead.id, { exam_date: null });
    toast({ title: "Agendamento removido" });
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] text-muted-foreground">Data e hora do exame</label>
      <div className="flex items-center gap-2">
        <Input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 text-xs"
        />
        <Button size="sm" onClick={handleConfirm} disabled={saving} className="h-9">
          Confirmar
        </Button>
        {lead.exam_date && (
          <Button size="sm" variant="ghost" onClick={handleClear} className="h-9">
            Limpar
          </Button>
        )}
      </div>
      {lead.exam_date && (
        <p className="text-[11px] text-muted-foreground">
          Agendado para {new Date(lead.exam_date).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
}

function LeadNotesSection({
  lead,
  updateLead,
}: {
  lead: Lead;
  updateLead: (leadId: string, patch: Partial<Lead>) => Promise<void>;
}) {
  const [value, setValue] = useState(lead.notes ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSavedRef = useRef<string>(lead.notes ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(lead.notes ?? "");
    lastSavedRef.current = lead.notes ?? "";
  }, [lead.id]);

  useEffect(() => {
    if (value === lastSavedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await updateLead(lead.id, { notes: value });
        lastSavedRef.current = value;
        setSavedAt(Date.now());
      } catch {
        // ignore; toast handled upstream
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, lead.id, updateLead]);

  const showSaved = savedAt && Date.now() - savedAt < 2500;
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  return (
    <div className="border-b bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <NotebookPen className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Observações</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Anote qualquer informação relevante sobre este lead... (preferências, restrições, histórico, etc.)"
        rows={3}
        className="min-h-[72px] text-sm resize-y"
      />
      <p
        className={cn(
          "text-[11px] text-muted-foreground mt-1 transition-opacity duration-300",
          showSaved ? "opacity-100" : "opacity-0"
        )}
      >
        Salvo automaticamente
      </p>
    </div>
  );
}
