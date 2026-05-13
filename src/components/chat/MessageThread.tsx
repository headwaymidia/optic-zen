import { useEffect, useRef } from "react";
import { Check, CheckCheck, Reply } from "lucide-react";
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

function MessageContent({ media_type, media_url, text }: { media_type?: string | null; media_url?: string | null; text: string }) {
  if (media_type === "audio") {
    return media_url ? (
      <AudioPlayer src={media_url} />
    ) : (
      <span>🎵 Áudio</span>
    );
  }
  if (media_type === "image" && media_url) {
    return (
      <img
        src={media_url}
        alt="imagem"
        className="rounded-lg w-full h-auto"
        style={{ maxWidth: 280 }}
      />
    );
  }
  if (media_type === "video" && media_url) {
    return (
      <video
        controls
        src={media_url}
        className="rounded-lg w-full h-auto"
        style={{ maxWidth: 280 }}
      />
    );
  }
  return <p className="whitespace-pre-wrap break-words">{text ?? ""}</p>;
}

function StatusTicks({ status }: { status?: string | null }) {
  if (status === "read") return <CheckCheck className="h-3 w-3 text-sky-500" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  return <Check className="h-3 w-3 text-muted-foreground" />;
}

interface Props {
  messages: ChatMessage[];
  sentMessages: SentMessage[];
  isTyping: boolean;
  onReply?: (m: ChatMessage) => void;
}

function QuoteBlock({ text }: { text: string }) {
  return (
    <div className="mb-1 border-l-2 border-emerald-500/70 bg-black/5 dark:bg-white/5 rounded px-2 py-1 text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
      {text}
    </div>
  );
}

export function MessageThread({ messages, sentMessages, isTyping, onReply }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sentMessages.length, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 px-3 py-4 space-y-2">
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
                "max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm text-sm",
                m.from === "us"
                  ? "bg-green-100 text-foreground rounded-br-sm dark:bg-green-900/40"
                  : "bg-card text-foreground rounded-bl-sm"
              )}
            >
              {quote && <QuoteBlock text={quote} />}
              <MessageContent media_type={m.media_type} media_url={m.media_url} text={body} />
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
        return (
          <div key={`sent-${i}`} className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm text-sm bg-green-100 text-foreground rounded-br-sm dark:bg-green-900/40">
              {quote && <QuoteBlock text={quote} />}
              <MessageContent media_type={m.media_type} media_url={m.media_url} text={body} />
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right flex items-center justify-end gap-1">
                <span>{m.time}</span>
                <StatusTicks status={m.status ?? "sent"} />
              </p>
            </div>
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
      <div ref={endRef} />
    </div>
  );
}
