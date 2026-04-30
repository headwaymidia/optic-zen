import { useState } from "react";
import { toast } from "@/hooks/use-toast";
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
import { ERPTransferCard } from "@/components/ERPTransferCard";
import { StageGateDialog, isGatedStatus, type StageGate } from "@/components/StageGateDialog";
import { ArrowLeft, Paperclip, Send, Smile, X, Zap, Eye, CalendarClock, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getFollowUpDef,
  getPendingFollowUpLevel,
  MAX_FOLLOW_UPS,
} from "@/lib/followUpScripts";

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
  const [gateStatus, setGateStatus] = useState<StageGate | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sentMessages, setSentMessages] = useState<{ from: "us"; text: string; time: string }[]>([]);

  const handleStatusChange = (next: LeadStatus) => {
    if (next === lead.status) return;
    if (isGatedStatus(next)) {
      setGateStatus(next);
      return;
    }
    updateStatus(lead.id, next);
  };

  const firstName = lead.name.split(" ")[0];

  // Move automaticamente para "Em Atendimento" se ainda for "Novo Lead"
  const promoteToInAttendance = () => {
    if (lead.status === "Novo Lead") {
      updateStatus(lead.id, "Em Atendimento");
    }
  };

  // Cadência de Vendas — detecta se há follow-up pendente
  const isCadenceStatus =
    lead.status === "Em Atendimento" || lead.status === "Aguardando Resposta";
  const pendingLevel = isCadenceStatus
    ? getPendingFollowUpLevel(
        lead.follow_up_count ?? 0,
        lead.last_follow_up_at ?? null,
        lead.updated_at || lead.created_at
      )
    : null;
  const pendingDef = pendingLevel ? getFollowUpDef(pendingLevel) : null;
  const reachedMax = (lead.follow_up_count ?? 0) >= MAX_FOLLOW_UPS;

  const handleSend = () => {
    if (!message.trim()) return;
    promoteToInAttendance();
    // (envio real da mensagem ficaria aqui)
    setMessage("");
  };

  // Pré-preenche o input com o script do FU pendente
  const handleApplyFollowUpScript = () => {
    if (!pendingDef) return;
    setMessage(pendingDef.buildScript(firstName));
  };

  // Envia o follow-up: mostra "digitando..." → adiciona no chat → persiste no DB
  const handleSendFollowUp = async () => {
    if (!message.trim() || !pendingDef) return;
    const text = message.trim();
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    promoteToInAttendance();
    setMessage("");

    // Efeito "digitando..." antes do despacho
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsTyping(false);

    // Mensagem aparece no histórico visível imediatamente
    setSentMessages((prev) => [...prev, { from: "us", text, time }]);

    // Registro no histórico de interações do contato (Supabase)
    try {
      await updateLead(lead.id, {
        follow_up_count: (lead.follow_up_count ?? 0) + 1,
        last_follow_up_at: now.toISOString(),
      });
      toast({
        title: `Follow-up ${pendingLevel} enviado`,
        description: `Registrado no histórico de ${firstName}.`,
      });
    } catch (err: any) {
      toast({
        title: "Falha ao registrar follow-up",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

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
    <div className="flex flex-col h-full bg-background min-w-0 animate-in slide-in-from-right fade-in duration-300 ease-out">
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
          <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
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
        {(() => {
          const baseTrigger = "h-7 flex-1 text-[11px] transition-colors duration-200";
          const okTrigger =
            "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-50 focus:ring-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-200";
          const pendingTrigger =
            "border-red-500 text-red-600 bg-red-50 hover:bg-red-50 focus:ring-red-500 dark:bg-red-950/30 dark:text-red-300";
          const sourceOk = !!lead.lead_source;
          const interestOk = !!lead.interest_tag;
          const assignedOk = !!lead.assigned_to;
          return (
            <div className="flex items-center gap-2">
              <Select
                value={(lead.lead_source as string) || "__none__"}
                onValueChange={(v) =>
                  updateLead(lead.id, { lead_source: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger className={cn(baseTrigger, sourceOk ? okTrigger : pendingTrigger)}>
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
                <SelectTrigger className={cn(baseTrigger, interestOk ? okTrigger : pendingTrigger)}>
                  <SelectValue placeholder="Tipo de Atendimento" />
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
                <SelectTrigger className={cn(baseTrigger, assignedOk ? okTrigger : pendingTrigger)}>
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
          );
        })()}
      </header>

      {(() => {
        const p = lead.prescription ?? {};
        const prescriptionOk = Boolean(
          (p.esferico_od && p.esferico_od.toString().trim()) ||
            (p.esferico_oe && p.esferico_oe.toString().trim()) ||
            (p.cilindrico_od && p.cilindrico_od.toString().trim()) ||
            (p.cilindrico_oe && p.cilindrico_oe.toString().trim()) ||
            (p.adicao && p.adicao.toString().trim()) ||
            (p.dnp && p.dnp.toString().trim())
        );
        const labOk = Boolean(lead.delivery_prediction || lead.lab_status);
        return (
          <Accordion
            key={lead.id}
            type="single"
            collapsible
            className="border-b bg-card/50"
          >
            <AccordionItem value="prescription" className="border-0 border-b">
              <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline hover:bg-muted/50">
                <span className="flex items-center gap-2 flex-1 text-left">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Receita Oftalmológica</span>
                  <ChecklistBadge ok={prescriptionOk} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 pt-0">
                <PrescriptionForm lead={lead} />
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
                <LabOrderForm lead={lead} onApplyScript={(msg) => setMessage(msg)} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })()}
      <ERPTransferCard lead={lead} />
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
        {sentMessages.map((m, i) => (
          <div key={`sent-${i}`} className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm text-sm bg-green-100 text-foreground rounded-br-sm dark:bg-green-900/40">
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{m.time}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-end" aria-live="polite" aria-label="Digitando">
            <div className="rounded-2xl rounded-br-sm bg-green-100 dark:bg-green-900/40 px-3 py-2 shadow-sm">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700/70 dark:bg-emerald-200/70 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700/70 dark:bg-emerald-200/70 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-700/70 dark:bg-emerald-200/70 animate-bounce" />
                <span className="ml-1 text-[10px] text-muted-foreground">digitando…</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Banner de Cadência — sugestão do próximo follow-up */}
      {pendingDef && (
        <div className="border-t bg-amber-50 dark:bg-amber-900/20 px-3 py-2 flex items-center gap-2">
          <div className="shrink-0 h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-amber-700 dark:text-amber-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-100 leading-tight">
              Ação sugerida: {pendingDef.label}
            </p>
            <p className="text-[10px] text-amber-800/80 dark:text-amber-200/70 truncate">
              {pendingDef.hint} · sem retorno há 8h+
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={handleApplyFollowUpScript}
            className="h-7 text-[11px] gap-1 bg-white hover:bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-700"
          >
            Usar script
          </Button>
        </div>
      )}
      {reachedMax && isCadenceStatus && (
        <div className="border-t bg-red-50 dark:bg-red-900/20 px-3 py-2 text-[11px] text-red-800 dark:text-red-200">
          🏁 Cadência completa ({MAX_FOLLOW_UPS} tentativas). Lead será movido para Repescagem em até 24h sem resposta.
        </div>
      )}

      <footer className="border-t bg-card p-2 flex items-center gap-1">
        <Button variant="ghost" size="icon" type="button" className="h-8 w-8">
          <Smile className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" type="button" className="h-8 w-8">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Popover open={scriptsOpen} onOpenChange={setScriptsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-8 w-8"
                  aria-label="Respostas Rápidas"
                >
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Respostas Rápidas</TooltipContent>
          </Tooltip>
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-muted/50 border-0 h-9"
        />
        <Button
          size={pendingDef ? "default" : "icon"}
          type="button"
          onClick={pendingDef ? handleSendFollowUp : handleSend}
          className={cn(
            "h-9 text-white gap-1.5",
            pendingDef ? "px-3" : "w-9",
            pendingDef ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"
          )}
        >
          <Send className="h-4 w-4" />
          {pendingDef && <span className="text-xs font-semibold">Enviar FU{pendingLevel}</span>}
        </Button>
      </footer>
      <StageGateDialog
        open={!!gateStatus}
        lead={lead}
        targetStatus={gateStatus}
        onCancel={() => setGateStatus(null)}
        onConfirm={async (patch) => {
          await updateLead(lead.id, patch);
          setGateStatus(null);
        }}
      />
    </div>
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
