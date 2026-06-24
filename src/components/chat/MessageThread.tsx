import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, CheckCheck, Clock, History, Reply, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "@/components/chat/AudioPlayer";

/** Splits a markdown-style quote prefix ("> ...\n\n...") from the body. */
function parseQuote(text: string): { quote: string | null; body: string } {
  if (!text || !text.startsWith("> ")) return { quote: null, body: text ?? "" };
  const sepIdx = text.indexOf("\n\n");
  if (sepIdx === -1) return { quote: null, body: text };
  const quoteBlock = text.slice(2, sepIdx).replace(/\n> /g, "\n");
  return { quote: quoteBlock, body: text.slice(sepIdx + 2) };
}

export interface ChatMessage {
  from: "lead" | "us";
  text: string;
  time: string;
  status?: string | null;
  media_type?: string | null;
  media_url?: string | null;
}

export interface SentMessage {
  id?: string;
  from: "us";
  text: string;
  time: string;
  status?: string | null;
  media_type?: string | null;
  media_url?: string | null;
}

function MediaPlaceholder({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs italic text-muted-foreground">
      {label}
    </span>
  );
}

function MessageContent({ media_type, media_url, text, onImageClick }: { media_type?: string | null; media_url?: string | null; text: string; onImageClick?: (url: string) => void }) {
  if (media_type === "audio") {
    return media_url ? <AudioPlayer src={media_url} /> : <MediaPlaceholder label="🎵 Áudio indisponível" />;
  }
  if (media_type === "image") {
    if (!media_url) return <MediaPlaceholder label="📷 Imagem indisponível" />;
    return (
      <img
        src={media_url}
        alt="imagem"
        loading="lazy"
        onClick={() => onImageClick?.(media_url)}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        className="rounded-lg w-full h-auto max-w-full sm:max-w-[280px] cursor-zoom-in"
      />
    );
  }
  if (media_type === "video") {
    if (!media_url) return <MediaPlaceholder label="🎬 Vídeo indisponível" />;
    return (
      <video
        controls
        src={media_url}
        className="rounded-lg w-full h-auto max-w-full sm:max-w-[280px]"
      />
    );
  }
  if (media_type === "document") {
    return media_url ? (
      <a href={media_url} target="_blank" rel="noreferrer" className="text-xs underline">
        📎 Documento
      </a>
    ) : (
      <MediaPlaceholder label="📎 Documento indisponível" />
    );
  }
  if (!text && media_type) {
    return <MediaPlaceholder label="Mensagem sem conteúdo" />;
  }
  return <p className="whitespace-pre-wrap break-words">{text ?? ""}</p>;
}

function StatusTicks({ status }: { status?: string | null }) {
  if (status === "sending") return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
  if (status === "queued") return <History className="h-3 w-3 text-amber-500" aria-label="Na fila" />;
  if (status === "failed") return <AlertCircle className="h-3 w-3 text-red-500" />;
  if (status === "read") return <CheckCheck className="h-3 w-3 text-sky-500" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  return <Check className="h-3 w-3 text-muted-foreground" />;
}

interface Props {
  messages: ChatMessage[];
  sentMessages: SentMessage[];
  isTyping: boolean;
  onReply?: (m: ChatMessage) => void;
  onRetry?: (m: SentMessage) => void;
  leadId?: string;
}

function QuoteBlock({ text }: { text: string }) {
  return (
    <div className="mb-1 border-l-2 border-emerald-500/70 bg-black/5 dark:bg-white/5 rounded px-2 py-1 text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
      {text}
    </div>
  );
}

export function MessageThread({ messages, sentMessages, isTyping, onReply, onRetry, leadId }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // Instant scroll when switching leads
  useEffect(() => {
    scrollToBottom();
  }, [leadId]);

  // Scroll on new messages / typing — rAF so layout has settled
  useEffect(() => {
    const id = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(id);
  }, [messages.length, sentMessages.length, isTyping]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-muted/40 px-3 py-4 space-y-2">
      {messages.map((m, i) => {
        const { quote, body } = parseQuote(m.text ?? "");
        return (
          <div key={i} className={cn("group flex items-center gap-1", m.from === "us" ? "justify-end" : "justify-start")}>
            {m.from === "us" && onReply && (
              <button
                type="button"
                onClick={() => onReply({ ...m, text: body })}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
                aria-label="Responder"
                title="Responder"
              >
                <Reply className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <div
              className={cn(
                "max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm text-sm",
                m.from === "us"
                  ? "bg-green-100 text-foreground rounded-br-sm dark:bg-green-900/40"
                  : "bg-card text-foreground rounded-bl-sm"
              )}
            >
              {quote && <QuoteBlock text={quote} />}
              <MessageContent media_type={m.media_type} media_url={m.media_url} text={body} onImageClick={setLightbox} />
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right flex items-center justify-end gap-1">
                <span>{m.time}</span>
                {m.from === "us" && <StatusTicks status={m.status} />}
              </p>
            </div>
            {m.from === "lead" && onReply && (
              <button
                type="button"
                onClick={() => onReply({ ...m, text: body })}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
                aria-label="Responder"
                title="Responder"
              >
                <Reply className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        );
      })}
      {sentMessages.map((m, i) => {
        const { quote, body } = parseQuote(m.text ?? "");
        const isFailed = m.status === "failed";
        return (
          <div key={`sent-${i}`} className="flex justify-end flex-col items-end gap-0.5">
            <div className={cn(
              "max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm text-sm rounded-br-sm",
              isFailed
                ? "bg-red-50 dark:bg-red-900/20 ring-1 ring-red-300 dark:ring-red-700"
                : "bg-green-100 text-foreground dark:bg-green-900/40"
            )}>
              {quote && <QuoteBlock text={quote} />}
              <MessageContent media_type={m.media_type} media_url={m.media_url} text={body} onImageClick={setLightbox} />
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right flex items-center justify-end gap-1">
                <span>{m.time}</span>
                <StatusTicks status={m.status ?? "sent"} />
              </p>
            </div>
            {isFailed && (
              <div className="flex items-center gap-2 pr-1">
                <span className="text-[10px] text-red-500 font-medium">Falha no envio</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(m)}
                    className="text-[10px] text-primary underline hover:no-underline font-medium"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
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
      
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="imagem ampliada"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
