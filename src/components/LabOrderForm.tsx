import { useEffect, useState } from "react";
import { LAB_STATUSES, LabStatus, Lead } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import { useStores } from "@/hooks/useStores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageCircle, CalendarClock, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function LabOrderForm({
  lead,
  onApplyScript,
}: {
  lead: Lead;
  onApplyScript?: (msg: string) => void;
}) {
  const { updateLead } = useLeads();
  const { currentStore } = useStores();
  const closingHour = currentStore?.business_hours_end ?? 18;
  const [date, setDate] = useState<string>(lead.delivery_prediction ?? "");
  const [labName, setLabName] = useState<string>(lead.lab_name ?? "");
  const [orderNumber, setOrderNumber] = useState<string>(lead.lab_order_number ?? "");

  useEffect(() => {
    setDate(lead.delivery_prediction ?? "");
    setLabName(lead.lab_name ?? "");
    setOrderNumber(lead.lab_order_number ?? "");
  }, [lead.id, lead.delivery_prediction, lead.lab_name, lead.lab_order_number]);

  const currentStatus = (lead.lab_status as LabStatus | null) ?? null;
  const currentIndex = currentStatus ? LAB_STATUSES.indexOf(currentStatus) : -1;

  const handleStepClick = (s: LabStatus) => {
    if (s === currentStatus) return;
    updateLead(lead.id, { lab_status: s });
  };

  const commitIfChanged = (field: "delivery_prediction" | "lab_name" | "lab_order_number", value: string) => {
    const next = value || null;
    const prev = (lead[field] as string | null) ?? null;
    if (next !== prev) updateLead(lead.id, { [field]: next } as Partial<Lead>);
  };

  const handleReadyMessage = () => {
    const firstName = lead.name.split(" ")[0];
    const msg = `Olá ${firstName}, ótimas notícias! 🎉 Seus óculos novos acabaram de chegar do nosso laboratório e passaram na nossa conferência de qualidade. Já estão prontinhos aqui na loja esperando por você! Nosso horário de funcionamento é até às ${closingHour}h. Nos vemos em breve?`;
    onApplyScript?.(msg);
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        Pedido / Laboratório
      </div>
      <div className="p-3 space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Status do Pedido
          </Label>
          <div className="flex items-center">
            {LAB_STATUSES.map((s, i) => {
              const reached = currentIndex >= i;
              const isCurrent = currentIndex === i;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => handleStepClick(s)}
                    className="flex flex-col items-center gap-1 group"
                    aria-label={s}
                  >
                    <span
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold border transition-colors",
                        reached
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border group-hover:bg-muted/70",
                        isCurrent && "ring-2 ring-primary/30"
                      )}
                    >
                      {reached ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] text-center leading-tight max-w-[64px]",
                        isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {s}
                    </span>
                  </button>
                  {i < LAB_STATUSES.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-1 -mt-5 transition-colors",
                        currentIndex > i ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {currentStatus === "Pronto no laboratório" && (
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleReadyMessage}
                    className="h-8 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Avisar cliente
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Inserir mensagem de aviso no chat</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Laboratório
            </Label>
            <Input
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              onBlur={() => commitIfChanged("lab_name", labName)}
              placeholder="Ex: Indo, Hoya, Zeiss"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Número da OS
            </Label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onBlur={() => commitIfChanged("lab_order_number", orderNumber)}
              placeholder="Ex: 123456"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Previsão de Entrega
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={() => commitIfChanged("delivery_prediction", date)}
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
