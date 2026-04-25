import { useEffect, useState } from "react";
import { Lead, LeadStatus } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarClock, DollarSign } from "lucide-react";

export type StageGate = "Agendou Exame" | "Compareceu e Comprou";

export function isGatedStatus(status: LeadStatus): status is StageGate {
  return status === "Agendou Exame" || status === "Compareceu e Comprou";
}

interface StageGateDialogProps {
  open: boolean;
  lead: Lead | null;
  targetStatus: StageGate | null;
  onCancel: () => void;
  onConfirm: (patch: Partial<Lead> & { status: LeadStatus }) => void | Promise<void>;
}

function toLocalInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StageGateDialog({ open, lead, targetStatus, onCancel, onConfirm }: StageGateDialogProps) {
  // Agendou Exame
  const [examAt, setExamAt] = useState("");
  // Compareceu e Comprou
  const [saleValue, setSaleValue] = useState("");
  const [needsLab, setNeedsLab] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (targetStatus === "Agendou Exame") {
      setExamAt(toLocalInputValue(lead?.follow_up_date));
    }
    if (targetStatus === "Compareceu e Comprou") {
      setSaleValue(lead?.sale_value ? String(lead.sale_value) : "");
      setNeedsLab(false);
    }
  }, [open, targetStatus, lead]);

  const parsedSale = Number((saleValue || "").toString().replace(",", "."));
  const validSale = !isNaN(parsedSale) && parsedSale > 0;

  const canSubmit =
    targetStatus === "Agendou Exame"
      ? !!examAt
      : targetStatus === "Compareceu e Comprou"
      ? validSale
      : false;

  async function handleConfirm() {
    if (!targetStatus || !canSubmit) return;
    setSubmitting(true);
    try {
      if (targetStatus === "Agendou Exame") {
        // Persist as ISO; reuse follow_up_date column for scheduled exam
        const iso = new Date(examAt).toISOString();
        await onConfirm({ status: "Agendou Exame", follow_up_date: iso });
      } else if (targetStatus === "Compareceu e Comprou") {
        await onConfirm({
          status: "Compareceu e Comprou",
          sale_value: parsedSale,
          lab_status: needsLab ? "Enviado ao Lab" : null,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {targetStatus === "Agendou Exame" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Confirmar Agendamento
              </DialogTitle>
              <DialogDescription>
                Informe a data e hora do exame de <span className="font-medium">{lead?.name}</span> para mover o lead.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="exam-at">Data e hora do exame</Label>
              <Input
                id="exam-at"
                type="datetime-local"
                value={examAt}
                onChange={(e) => setExamAt(e.target.value)}
                autoFocus
              />
            </div>
          </>
        )}

        {targetStatus === "Compareceu e Comprou" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Registrar Venda
              </DialogTitle>
              <DialogDescription>
                Confirme os dados da venda de <span className="font-medium">{lead?.name}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="sale-value">Valor da Venda (R$)</Label>
                <Input
                  id="sale-value"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                  autoFocus
                />
                {!validSale && saleValue.length > 0 && (
                  <p className="text-xs text-destructive">Informe um valor maior que zero.</p>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="needs-lab" className="text-sm">Necessita Laboratório?</Label>
                  <p className="text-xs text-muted-foreground">
                    Marca o pedido para envio ao laboratório.
                  </p>
                </div>
                <Switch id="needs-lab" checked={needsLab} onCheckedChange={setNeedsLab} />
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit || submitting}>
            {submitting ? "Salvando..." : "Salvar e Mover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
