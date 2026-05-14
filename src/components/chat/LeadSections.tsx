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
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Eye,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { LabOrderForm } from "@/components/LabOrderForm";
import { useLeads } from "@/hooks/useLeads";
import { Lead } from "@/integrations/supabase/client";

interface Props {
  lead: Lead;
  onApplyLabScript: (msg: string) => void;
}

export function LeadSections({ lead, onApplyLabScript }: Props) {
  const { updateLead } = useLeads();
  const p = lead.prescription ?? {};
  const has = (v: unknown) => typeof v === "string" ? v.trim() !== "" : v != null;
  const prescriptionOk = Boolean(has(p.esferico_od) && has(p.esferico_oe));
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

function ChecklistBadge({ ok, okLabel = "Ok" }: { ok: boolean; okLabel?: string }) {
  if (ok) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
        <CheckCircle2 className="h-3 w-3" />
        {okLabel}
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

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ExamScheduler({ lead }: { lead: Lead }) {
  const { updateLead, leads } = useLeads();
  const [value, setValue] = useState<string>(toLocalInputValue(lead.exam_date));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const selectedDayKey = value ? value.slice(0, 10) : todayKey();
  const bookedSameDay = selectedDayKey
    ? leads
        .filter((l) => {
          if (!l.exam_date || l.id === lead.id) return false;
          const d = new Date(l.exam_date);
          if (isNaN(d.getTime())) return false;
          const pad = (n: number) => String(n).padStart(2, "0");
          const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          return key === selectedDayKey;
        })
        .sort((a, b) => new Date(a.exam_date!).getTime() - new Date(b.exam_date!).getTime())
    : [];

  useEffect(() => {
    setValue(toLocalInputValue(lead.exam_date));
    setEditing(false);
  }, [lead.id, lead.exam_date]);

  async function handleConfirm() {
    if (!value) {
      toast({ title: "Selecione data e hora", variant: "destructive" });
      return;
    }
    setSaving(true);
    const iso = new Date(value).toISOString();
    await updateLead(lead.id, { exam_date: iso, status: "Agendou Exame" });
    setSaving(false);
    setEditing(false);
    toast({ title: `Exame agendado para ${new Date(iso).toLocaleString("pt-BR")}!` });
  }

  async function handleClear() {
    setValue("");
    setEditing(false);
    await updateLead(lead.id, { exam_date: null });
    toast({ title: "Agendamento removido" });
  }

  const showForm = editing || !lead.exam_date;

  if (!showForm && lead.exam_date) {
    const d = new Date(lead.exam_date);
    const dataStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const horaStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 w-full rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-2.5 py-2">
          <CalendarCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col sm:flex-row sm:gap-1 text-xs font-medium text-emerald-900 dark:text-emerald-100 break-words">
            <span>Agendado para</span>
            <span>{dataStr} às {horaStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-9">
            Remarcar
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear} className="h-9">
            Limpar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] text-muted-foreground">Data e hora do exame</label>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 text-xs flex-1 min-w-[180px]"
        />
        <Button size="sm" onClick={handleConfirm} disabled={saving} className="h-9">
          Confirmar
        </Button>
        {lead.exam_date && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-9">
            Cancelar
          </Button>
        )}
      </div>

      {selectedDayKey && (
        <div className="rounded-md border bg-muted/30 px-2.5 py-2 space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground">
            Agendamentos do dia{" "}
            {new Date(selectedDayKey + "T00:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
            :
          </div>
          {bookedSameDay.length === 0 ? (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Nenhum agendamento para este dia.
            </div>
          ) : (
            <ul className="space-y-1">
              {bookedSameDay.map((l) => {
                const d = new Date(l.exam_date!);
                const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 text-[11px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1"
                  >
                    <span className="font-semibold text-amber-900 dark:text-amber-100">{hora}</span>
                    <span className="truncate text-amber-900/80 dark:text-amber-100/80">{l.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
        placeholder="Anote qualquer informação relevante sobre este lead..."
        rows={2}
        className="min-h-[44px] text-sm resize-y"
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
