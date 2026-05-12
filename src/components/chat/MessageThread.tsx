import { useEffect, useRef } from "react";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "@/components/chat/AudioPlayer";

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
      <audio controls src={media_url} className="max-w-xs" />
    ) : (
      <span>🎵 Áudio</span>
    );
  }
  if (media_type === "image" && media_url) {
    return <img src={media_url} alt="imagem" className="max-w-xs rounded-lg" />;
  }
  if (media_type === "video" && media_url) {
    return <video controls src={media_url} className="max-w-xs rounded-lg" />;
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
}

export function MessageThread({ messages, sentMessages, isTyping }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sentMessages.length, isTyping]);

  return (
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
            <MessageContent media_type={m.media_type} media_url={m.media_url} text={m.text} />
            <p className="text-[10px] text-muted-foreground mt-0.5 text-right flex items-center justify-end gap-1">
              <span>{m.time}</span>
              {m.from === "us" && <StatusTicks status={m.status} />}
            </p>
          </div>
        </div>
      ))}
      {sentMessages.map((m, i) => (
        <div key={`sent-${i}`} className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl px-3 py-1.5 shadow-sm text-sm bg-green-100 text-foreground rounded-br-sm dark:bg-green-900/40">
            <MessageContent media_type={m.media_type} media_url={m.media_url} text={m.text} />
            <p className="text-[10px] text-muted-foreground mt-0.5 text-right flex items-center justify-end gap-1">
              <span>{m.time}</span>
              <StatusTicks status={m.status ?? "sent"} />
            </p>
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
      <div ref={endRef} />
    </div>
  );
}
