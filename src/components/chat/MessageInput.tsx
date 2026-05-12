import { useState } from "react";
import { Paperclip, Send, Smile, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FollowUpDef, FollowUpLevel } from "@/lib/followUpScripts";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onSendFollowUp: () => void;
  onApplyScript: (type: "agendar" | "receita" | "resgate" | "confirmar") => void;
  pendingDef: FollowUpDef | null;
  pendingLevel: FollowUpLevel | null;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onSendFollowUp,
  onApplyScript,
  pendingDef,
  pendingLevel,
}: Props) {
  const [scriptsOpen, setScriptsOpen] = useState(false);

  const handleApply = (type: "agendar" | "receita" | "resgate" | "confirmar") => {
    onApplyScript(type);
    setScriptsOpen(false);
  };

  return (
    <footer className="shrink-0 border-t bg-card p-2 flex items-center gap-1">
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
              onClick={() => handleApply("agendar")}
              className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="font-medium">Agendar Exame</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                Oferecer horários para exame de vista esta semana.
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleApply("receita")}
              className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="font-medium">Pedir Receita</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                Solicitar foto da receita para orçamento preciso.
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleApply("resgate")}
              className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="font-medium">Resgate de Orçamento</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                Repescagem com condição especial do gerente.
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleApply("confirmar")}
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder="Digite sua mensagem..."
        className="flex-1 bg-muted/50 border-0 h-9"
      />
      <Button
        size={pendingDef ? "default" : "icon"}
        type="button"
        onClick={pendingDef ? onSendFollowUp : onSend}
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
  );
}
