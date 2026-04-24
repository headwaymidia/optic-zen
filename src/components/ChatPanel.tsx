import { useState } from "react";
import { Lead, LEAD_STATUSES, LeadStatus } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Paperclip, Send, Smile, X, Zap } from "lucide-react";
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
  const { updateStatus } = useLeads();
  const messages = [
    { from: "lead", text: "Olá, gostaria de agendar um exame de vista.", time: "10:30" },
    { from: "us", text: `Olá ${lead.name.split(" ")[0]}! Claro, temos horários disponíveis amanhã. 😊`, time: "10:32" },
    { from: "lead", text: "Tem horário pela manhã?", time: "10:34" },
    { from: "us", text: "Sim! Posso agendar às 9h ou 10h30. Qual prefere?", time: "10:35" },
    { from: "lead", text: "10h30 está ótimo. Pode me passar o endereço?", time: "10:45" },
  ];

  return (
    <div className="flex flex-col h-full bg-background min-w-0">
      <header className="border-b bg-card px-3 py-2 flex items-center gap-2">
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
          <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
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
      </header>

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
        <Input placeholder="Digite sua mensagem..." className="flex-1 bg-muted/50 border-0 h-9" />
        <Button size="icon" className="h-9 w-9 bg-green-600 hover:bg-green-700 text-white">
          <Send className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}
