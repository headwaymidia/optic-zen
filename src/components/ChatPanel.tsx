import { useState } from "react";
import { INTEREST_TAGS, LEAD_SOURCES, Lead, LEAD_STATUSES, LeadStatus, SALESPEOPLE } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { LabOrderForm } from "@/components/LabOrderForm";
import { ArrowLeft, Paperclip, Send, Smile, X, Zap, Eye, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function priorityVariant(p: string | null) {
  if (p === "Alta") return "destructive";
  if (p === "Média") return "default";
  return "secondary";
}

export function ChatPanel({
  lead,
  onBack,
  onClose,
}: {
  lead: Lead;
  onBack?: () => void;
  onClose?: () => void;
}) {
  const { updateStatus, updateLead } = useLeads();
  const [message, setMessage] = useState("");
  const [scriptsOpen, setScriptsOpen] = useState(false);

  const firstName = lead.name.split(" ")[0];

  const applyScript = (scriptType: "agendar" | "receita" | "resgate" | "confirmar") => {
    const scripts = {
      agendar: `Olá ${firstName}! Tudo bem? Vi que você tem interesse em cuidar da sua visão. Temos alguns horários disponíveis para o exame de vista esta semana. Qual o melhor período para você: manhã ou tarde?`,
      receita: `Oi ${firstName}! Para eu conseguir te passar o orçamento certinho e te indicar a melhor tecnologia de lentes para o seu grau, você consegue me mandar uma foto nítida da sua receita oftalmológica?`,
      resgate: `Olá ${firstName}! Estou passando para avisar que consegui uma condição especial com o nosso gerente para aquela armação que você gostou. Conseguimos fechar o seu óculos novo hoje?`,
      confirmar: `Olá ${firstName}, tudo bem? Sua consulta com o nosso especialista está confirmada! 🕒 Nosso endereço é [Endereço da Ótica]. Podemos confirmar sua presença para deixar tudo pronto?`,
    };
    setMessage(scripts[scriptType]);
    setScriptsOpen(false);
  };

  const messages = [
    { from: "lead", text: "Olá, gostaria de agendar um exame de vista.", time: "10:30" },
    { from: "us", text: `Olá ${lead.name.split(" ")[0]}! Claro, temos horários disponíveis amanhã. 😊`, time: "10:32" },
    { from: "lead", text: "Tem horário pela manhã?", time: "10:34" },
    { from: "us", text: "Sim! Posso agendar às 9h ou 10h30. Qual prefere?", time: "10:35" },
    { from: "lead", text: "10h30 está ótimo. Pode me passar o endereço?", time: "10:45" },
  ];

  return (
    <div className="flex flex-col h-full bg-background min-w-0">
      <header className="border-b bg-card px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {initials(lead.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">{lead.name}</p>
              {lead.priority && (
                <Badge variant={priorityVariant(lead.priority) as any} className="text-[10px] h-4 px-1.5">
                  {lead.priority}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{lead.phone ?? "—"}</p>
          </div>
          <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v as LeadStatus)}>
            <SelectTrigger className="h-8 w-[110px] sm:w-[150px] text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Fechar chat">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={(lead.lead_source as string) || "__none__"}
            onValueChange={(v) =>
              updateLead(lead.id, { lead_source: v === "__none__" ? null : v })
            }
          >
            <SelectTrigger className="h-7 flex-1 text-[11px]">
              <SelectValue placeholder="Origem do Lead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">— Sem origem —</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(lead.interest_tag as string) || "__none__"}
            onValueChange={(v) =>
              updateLead(lead.id, { interest_tag: v === "__none__" ? null : v })
            }
          >
            <SelectTrigger className="h-7 flex-1 text-[11px]">
              <SelectValue placeholder="Tag de Interesse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">— Sem tag —</SelectItem>
              {INTEREST_TAGS.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={lead.assigned_to || "__none__"}
            onValueChange={(v) =>
              updateLead(lead.id, { assigned_to: v === "__none__" ? null : v })
            }
          >
            <SelectTrigger className="h-7 flex-1 text-[11px]">
              <SelectValue placeholder="Vendedora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">— Sem vendedora —</SelectItem>
              {SALESPEOPLE.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <Accordion type="single" collapsible className="border-b bg-card/50">
        <AccordionItem value="prescription" className="border-0 border-b">
          <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline hover:bg-muted/50">
            <span className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              Receita Oftalmológica (Prontuário)
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0">
            <PrescriptionForm lead={lead} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="lab" className="border-0">
          <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline hover:bg-muted/50">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              Gestão de Pedido / Laboratório
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0">
            <LabOrderForm lead={lead} onApplyScript={(msg) => setMessage(msg)} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex-1 overflow-y-auto bg-muted/40 px-3 py-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.from === "us" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm text-sm",
                m.from === "us"
                  ? "bg-green-100 text-foreground rounded-br-sm dark:bg-green-900/40"
                  : "bg-card text-foreground rounded-bl-sm"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      <footer className="border-t bg-card p-2 flex items-center gap-1">
        <Button variant="ghost" size="icon" type="button" className="h-8 w-8">
          <Smile className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" type="button" className="h-8 w-8">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Popover open={scriptsOpen} onOpenChange={setScriptsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-8 w-8"
              aria-label="Scripts rápidos"
            >
              <Zap className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-72 p-2">
            <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Respostas Rápidas
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => applyScript("agendar")}
                className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="font-medium">Agendar Exame</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                  Oferecer horários para exame de vista esta semana.
                </div>
              </button>
              <button
                type="button"
                onClick={() => applyScript("receita")}
                className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="font-medium">Pedir Receita</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                  Solicitar foto da receita para orçamento preciso.
                </div>
              </button>
              <button
                type="button"
                onClick={() => applyScript("resgate")}
                className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="font-medium">Resgate de Orçamento</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                  Repescagem com condição especial do gerente.
                </div>
              </button>
              <button
                type="button"
                onClick={() => applyScript("confirmar")}
                className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="font-medium">Confirmar Exame</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                  Combate ao no-show: confirma presença na consulta.
                </div>
              </button>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-muted/50 border-0 h-9"
        />
        <Button size="icon" className="h-9 w-9 bg-green-600 hover:bg-green-700 text-white">
          <Send className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}
