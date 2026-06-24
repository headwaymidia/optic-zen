import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { Loader2, Mic, Paperclip, Send, Smile, Square, Zap } from "lucide-react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { FollowUpDef, FollowUpLevel } from "@/lib/followUpScripts";
import { useQuickTemplates } from "@/hooks/useQuickTemplates";
import { QuickTemplatesManager } from "@/components/chat/QuickTemplatesManager";
import { METODO_OD } from "@/lib/metodoOD";

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
  isSending?: boolean;
  storeId?: string | null;
  leadName?: string | null;
  canEdit?: boolean;
  vendedorName?: string | null;
  storeName?: string | null;
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
  isSending = false,
  storeId = null,
  leadName = null,
  canEdit = false,
  vendedorName = null,
  storeName = null,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const isMobile = useIsMobile();
  const [isRecording, setIsRecording] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"templates" | "metodo">("templates");
  const [activeEtapa, setActiveEtapa] = useState<string | null>(null);
  const { templates, applyTemplate } = useQuickTemplates(storeId);
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
    <footer className="shrink-0 border-t bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center gap-1">
      {isMobile ? (
        <Sheet open={emojiOpen} onOpenChange={setEmojiOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-8 w-8 no-touch-min"
              aria-label="Inserir emoji"
            >
              <Smile className="h-4 w-4 text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 h-[60vh] flex items-start justify-center">
            <EmojiPicker
              onEmojiClick={(e) => onChange(value + e.emoji)}
              emojiStyle={EmojiStyle.NATIVE}
              theme={Theme.AUTO}
              width="100%"
              height="100%"
              searchPlaceholder="Buscar emoji..."
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-8 w-8"
                  aria-label="Inserir emoji"
                >
                  <Smile className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Emojis</TooltipContent>
          </Tooltip>
          <PopoverContent side="top" align="start" className="p-0 border-0 w-auto z-50">
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
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && onSendMedia) await onSendMedia(file);
        }}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="h-8 w-8"
            aria-label="Anexar imagem ou vídeo"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Enviar mídia</TooltipContent>
      </Tooltip>
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
      <>
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
          <PopoverContent side="top" align="start" className="w-80 p-0 overflow-hidden">
            {/* Abas */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setActiveTab("templates")}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-semibold transition-colors",
                  activeTab === "templates"
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ⚡ Meus Templates
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("metodo"); setActiveEtapa(null); }}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-semibold transition-colors",
                  activeTab === "metodo"
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                🎯 Método OD
              </button>
            </div>

            {/* Aba: Meus Templates */}
            {activeTab === "templates" && (
              <div>
                <div className="space-y-0.5 max-h-64 overflow-y-auto p-1.5">
                  {templates.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                      Nenhum template ainda.{canEdit ? " Clique em ⚙ para criar." : ""}
                    </p>
                  ) : (
                    templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const resolved = applyTemplate(t.body, { nome: leadName ?? "cliente", vendedora: vendedorName ?? "", loja: storeName ?? "" });
                          onChange(resolved);
                          setScriptsOpen(false);
                        }}
                        className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <div className="font-medium text-xs">{t.title}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {t.body.replace(/\{nome\}/g, leadName ?? "cliente").replace(/\{vendedora\}/g, vendedorName ?? "").replace(/\{loja\}/g, storeName ?? "")}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {canEdit && (
                  <div className="border-t p-1">
                    <button
                      type="button"
                      onClick={() => { setScriptsOpen(false); setManagerOpen(true); }}
                      className="w-full text-left rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5"
                    >
                      <Settings2 className="h-3 w-3" />
                      Gerenciar templates
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Aba: Método OD */}
            {activeTab === "metodo" && (
              <div className="max-h-72 overflow-y-auto">
                {activeEtapa === null ? (
                  /* Lista de etapas */
                  <div className="p-1.5 space-y-0.5">
                    {METODO_OD.map((etapa) => (
                      <button
                        key={etapa.id}
                        type="button"
                        onClick={() => setActiveEtapa(etapa.id)}
                        className="w-full text-left rounded-md px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-2 font-medium text-xs">
                          <span>{etapa.emoji}</span>
                          {etapa.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{etapa.scripts.length} roteiros →</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Scripts da etapa selecionada */
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveEtapa(null)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground border-b w-full transition-colors"
                    >
                      ← Voltar
                    </button>
                    <div className="p-1.5 space-y-0.5">
                      {METODO_OD.find(e => e.id === activeEtapa)?.scripts.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            const resolved = s.body
                              .replace(/\{nome\}/g, leadName ?? "cliente")
                              .replace(/\{vendedora\}/g, vendedorName ?? "")
                              .replace(/\{loja\}/g, storeName ?? "");
                            onChange(resolved);
                            setScriptsOpen(false);
                            setActiveEtapa(null);
                          }}
                          className="w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <div className="font-medium text-xs">{s.label}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {s.body.replace(/\{nome\}/g, leadName ?? "cliente").replace(/\{vendedora\}/g, vendedorName ?? "").replace(/\{loja\}/g, storeName ?? "")}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
        {storeId && (
          <QuickTemplatesManager
            storeId={storeId}
            canEdit={canEdit}
            open={managerOpen}
            onOpenChange={setManagerOpen}
          />
        )}
      </>
      {isRecording ? (
        <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-700 dark:text-red-200">
            Gravando… {fmt(elapsed)}
          </span>
        </div>
      ) : (
        <AutoResizeTextarea
          value={value}
          onChange={onChange}
          onEnter={() => {
            if (!isSending && value.trim()) onSend();
          }}
          disabled={isSending}
        />
      )}
      <Button
        size={pendingDef ? "default" : "icon"}
        type="button"
        onClick={pendingDef ? onSendFollowUp : onSend}
        disabled={isSending || (!pendingDef && !value.trim())}
        aria-busy={isSending}
        className={cn(
          "h-9 text-white gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed",
          pendingDef ? "px-3" : "w-9",
          pendingDef ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"
        )}
      >
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pendingDef && <span className="text-xs font-semibold">Enviar FU{pendingLevel}</span>}
      </Button>
    </footer>
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  onEnter,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  // ~20px line-height * 5 lines + padding
  const MAX_HEIGHT = 116;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // e.repeat: ignora auto-repeticao ao segurar Enter (causava envio 2-3x).
        if (e.key === "Enter" && !e.shiftKey && !e.repeat) {
          e.preventDefault();
          onEnter();
        }
      }}
      rows={1}
      placeholder="Digite sua mensagem..."
      disabled={disabled}
      className="flex-1 bg-muted/50 border-0 min-h-9 py-2 px-3 resize-none leading-5 text-base sm:text-sm disabled:opacity-60"
    />
  );
}
