import { useEffect, useState } from "react";
import { LAB_STATUSES, LabStatus, Lead } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, CalendarClock } from "lucide-react";

export function LabOrderForm({
  lead,
  onApplyScript,
}: {
  lead: Lead;
  onApplyScript?: (msg: string) => void;
}) {
  const { updateLead } = useLeads();
  const [date, setDate] = useState<string>(lead.delivery_prediction ?? "");
  const [status, setStatus] = useState<string>(lead.lab_status ?? "__none__");

  useEffect(() => {
    setDate(lead.delivery_prediction ?? "");
    setStatus(lead.lab_status ?? "__none__");
  }, [lead.id, lead.delivery_prediction, lead.lab_status]);

  const handleDateBlur = () => {
    const next = date || null;
    if (next !== (lead.delivery_prediction ?? null)) {
      updateLead(lead.id, { delivery_prediction: next });
    }
  };

  const handleStatusChange = (v: string) => {
    setStatus(v);
    const next = v === "__none__" ? null : (v as LabStatus);
    updateLead(lead.id, { lab_status: next });
  };

  const handleReadyMessage = () => {
    const firstName = lead.name.split(" ")[0];
    const msg = `Olá ${firstName}, ótimas notícias! 🎉 Seus óculos novos acabaram de chegar do nosso laboratório e passaram na nossa conferência de qualidade. Já estão prontinhos aqui na loja esperando por você! Nosso horário de funcionamento é até às 19h. Nos vemos em breve?`;
    onApplyScript?.(msg);
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        Pedido / Laboratório
      </div>
      <div className="p-3 space-y-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Previsão de Entrega
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={handleDateBlur}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Status do Laboratório
          </Label>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 flex-1 text-sm">
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-sm">— Sem status —</SelectItem>
                {LAB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {status === "Pronto para Retirada" && (
              <Button
                type="button"
                size="icon"
                onClick={handleReadyMessage}
                className="h-9 w-9 shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white"
                aria-label="Avisar cliente via WhatsApp"
                title="Preencher mensagem de retirada"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
