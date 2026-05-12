import { useRef, useState } from "react";
import { Mic, Paperclip, Send, Smile, Square, Zap } from "lucide-react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
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
  onSendAudio?: (blob: Blob) => Promise<void> | void;
  onSendMedia?: (file: File) => Promise<void> | void;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onSendFollowUp,
  onApplyScript,
  pendingDef,
  pendingLevel,
  onSendAudio,
  onSendMedia,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const handleApply = (type: "agendar" | "receita" | "resgate" | "confirmar") => {
    onApplyScript(type);
    setScriptsOpen(false);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/ogg; codecs=opus")
        ? "audio/ogg; codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (onSendAudio && blob.size > 0) await onSendAudio(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setElapsed(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      console.error("[MessageInput] mic error", err);
    }
  };

  const stopRecording = () => {
    stopTimer();
    setIsRecording(false);
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <footer className="shrink-0 border-t bg-card p-2 flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" type="button" className="h-8 w-8" aria-label="Inserir emoji" title="Emojis">
            <Smile className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="p-0 border-0 w-auto">
          <EmojiPicker
            onEmojiClick={(e) => onChange(value + e.emoji)}
            emojiStyle={EmojiStyle.NATIVE}
            theme={Theme.AUTO}
            width={320}
            height={400}
            searchPlaceholder="Buscar emoji..."
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
          />
        </PopoverContent>
      </Popover>
      <input
        id="file-upload-input"
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && onSendMedia) await onSendMedia(file);
        }}
      />
      <label
        htmlFor="file-upload-input"
        title="Enviar mídia"
        aria-label="Anexar imagem ou vídeo"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer"
      >
        <Paperclip className="h-4 w-4 text-muted-foreground" />
      </label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={toggleRecording}
            aria-label={isRecording ? "Parar gravação" : "Gravar áudio"}
            title="Gravar áudio"
            className={cn(
              "h-8 w-8",
              isRecording && "bg-red-100 hover:bg-red-200 dark:bg-red-900/40"
            )}
          >
            {isRecording ? (
              <Square className="h-4 w-4 text-red-600 dark:text-red-300 fill-current" />
            ) : (
              <Mic className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isRecording ? "Parar e enviar" : "Gravar áudio"}
        </TooltipContent>
      </Tooltip>
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
                title="Ações rápidas"
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
      {isRecording ? (
        <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-700 dark:text-red-200">
            Gravando… {fmt(elapsed)}
          </span>
        </div>
      ) : (
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
      )}
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
