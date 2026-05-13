import { useEffect, useMemo, useState } from "react";
import { Reply, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { Lead, LeadStatus, supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import { useStores } from "@/hooks/useStores";
import { ERPTransferCard } from "@/components/ERPTransferCard";
import { StageGateDialog, isGatedStatus, type StageGate } from "@/components/StageGateDialog";
import { LeadHeader } from "@/components/chat/LeadHeader";
import { LeadDropdowns } from "@/components/chat/LeadDropdowns";
import { LeadSections } from "@/components/chat/LeadSections";
import { MessageThread, type ChatMessage, type SentMessage } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { LeadActivities } from "@/components/chat/LeadActivities";
import { useWhatsAppMessages } from "@/hooks/useWhatsAppMessages";
import {
  getFollowUpDef,
  getPendingFollowUpLevel,
  MAX_FOLLOW_UPS,
} from "@/lib/followUpScripts";

export function ChatPanel({
  lead,
  onBack,
  onClose,
  chatOnly = false,
}: {
  lead: Lead;
  onBack?: () => void;
  onClose?: () => void;
  chatOnly?: boolean;
}) {
  if (import.meta.env.DEV) console.log("[ChatPanel] lead.id:", lead?.id);
  const { updateStatus, updateLead } = useLeads();
  const { currentStoreId } = useStores();
  const [message, setMessage] = useState("");
  const [gateStatus, setGateStatus] = useState<StageGate | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<{ from: "us" | "lead"; text: string } | null>(null);

  // Reseta mensagens locais quando troca de lead
  useEffect(() => {
    setSentMessages([]);
    setReplyTo(null);
  }, [lead.id]);

  const handleStatusChange = (next: LeadStatus) => {
    if (next === lead.status) return;
    if (isGatedStatus(next)) {
      setGateStatus(next);
      return;
    }
    updateStatus(lead.id, next);
  };

  const firstName = lead.name.split(" ")[0];

  const promoteToInAttendance = () => {
    if (lead.status === "Novo Lead") {
      updateStatus(lead.id, "Em Atendimento");
    }
  };

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

  const handleSend = async () => {
    const raw = message.trim();
    if (!raw) return;
    if (!currentStoreId) {
      toast({ title: "Selecione uma loja antes de enviar", variant: "destructive" });
      return;
    }
    if (!lead.phone) {
      toast({ title: "Lead sem telefone", variant: "destructive" });
      return;
    }
    const text = replyTo
      ? `> ${replyTo.text.split("\n").join("\n> ")}\n\n${raw}`
      : raw;
    promoteToInAttendance();
    setMessage("");
    setReplyTo(null);

    const optimisticId = crypto.randomUUID();
    const now = new Date();
    const optimistic: SentMessage = {
      id: optimisticId,
      from: "us",
      text,
      time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    setSentMessages((prev) => [...prev, optimistic]);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "sendMessage",
          store_id: currentStoreId,
          lead_id: lead.id,
          phone: lead.phone,
          message: text,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refetchMessages();
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } catch (err: any) {
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast({
        title: "Falha ao enviar mensagem",
        description: humanizeError(err),
        variant: "destructive",
      });
      setMessage(raw);
    }
  };

  const handleSendAudio = async (blob: Blob) => {
    if (!currentStoreId) {
      toast({ title: "Selecione uma loja antes de enviar", variant: "destructive" });
      return;
    }
    if (!lead.phone) {
      toast({ title: "Lead sem telefone", variant: "destructive" });
      return;
    }
    promoteToInAttendance();

    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const optimisticId = crypto.randomUUID();
    const now = new Date();
    const audioUrl = URL.createObjectURL(blob);
    setSentMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        from: "us",
        text: "",
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        media_type: "audio",
        media_url: audioUrl,
      },
    ]);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "sendMessage",
          store_id: currentStoreId,
          lead_id: lead.id,
          phone: lead.phone,
          audioMessage: {
            base64,
            mimetype: "audio/ogg; codecs=opus",
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refetchMessages();
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } catch (err: any) {
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast({
        title: "Falha ao enviar áudio",
        description: humanizeError(err),
        variant: "destructive",
      });
    }
  };

  const handleSendMedia = async (file: File) => {
    if (!currentStoreId) {
      toast({ title: "Selecione uma loja antes de enviar", variant: "destructive" });
      return;
    }
    if (!lead.phone) {
      toast({ title: "Lead sem telefone", variant: "destructive" });
      return;
    }
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Formato não suportado", variant: "destructive" });
      return;
    }
    promoteToInAttendance();

    const optimisticId = crypto.randomUUID();
    const now = new Date();
    const localUrl = URL.createObjectURL(file);
    setSentMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        from: "us",
        text: "",
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        media_type: isImage ? "image" : "video",
        media_url: localUrl,
      },
    ]);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${currentStoreId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("whatsapp-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5 anos
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Falha ao gerar URL");
      const publicUrl = signed.signedUrl;

      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "sendMessage",
          store_id: currentStoreId,
          lead_id: lead.id,
          phone: lead.phone,
          mediaUrl: publicUrl,
          mediaType: isImage ? "image" : "video",
          caption: "",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refetchMessages();
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } catch (err: any) {
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast({
        title: isImage ? "Falha ao enviar imagem" : "Falha ao enviar vídeo",
        description: humanizeError(err),
        variant: "destructive",
      });
    }
  };

  const handleApplyFollowUpScript = () => {
    if (!pendingDef) return;
    setMessage(pendingDef.buildScript(firstName));
  };

  const handleSendFollowUp = async () => {
    if (!message.trim() || !pendingDef) return;
    const text = message.trim();
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    promoteToInAttendance();
    setMessage("");

    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsTyping(false);

    setSentMessages((prev) => [...prev, { from: "us", text, time }]);

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
        description: humanizeError(err),
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
  };

  const { messages: waMessages, refetch: refetchMessages } = useWhatsAppMessages(lead.id);
  const allMessages: ChatMessage[] = waMessages.map((m) => ({
    from: m.from_me ? "us" : "lead",
    text: m.body ?? "",
    time: new Date(m.timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: m.status,
    media_type: m.media_type,
    media_url: m.media_url,
  }));

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allMessages;
    return allMessages.filter((m) => (m.text ?? "").toLowerCase().includes(q));
  }, [allMessages, searchQuery]);
  const messages = filteredMessages;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background min-w-0 animate-in slide-in-from-right fade-in duration-300 ease-out">
      <header className="shrink-0 border-b bg-card px-3 py-2 space-y-2">
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            <LeadHeader
              lead={lead}
              onBack={onBack}
              onClose={onClose}
              onStatusChange={handleStatusChange}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              setSearchOpen((s) => !s);
              if (searchOpen) setSearchQuery("");
            }}
            aria-label={searchOpen ? "Fechar busca" : "Buscar na conversa"}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {searchOpen && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              placeholder="Buscar nesta conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <p className="text-[10px] text-muted-foreground mt-1 px-1">
              {searchQuery
                ? `${filteredMessages.length} resultado${filteredMessages.length === 1 ? "" : "s"}`
                : "Digite para filtrar"}
            </p>
          </div>
        )}
        <LeadDropdowns lead={lead} />
      </header>

      {lead.lab_status === "Pronto no laboratório" && (
        <div className="shrink-0 border-b bg-amber-100 dark:bg-amber-900/30 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
          <span>⚠️ Pedido pronto — avisar o cliente</span>
        </div>
      )}

      {!chatOnly && (
        <div className="shrink-0 max-h-[40%] overflow-y-auto border-b">
          <LeadSections lead={lead} onApplyLabScript={(msg) => setMessage(msg)} />
          <LeadActivities leadId={lead.id} />
          <ERPTransferCard lead={lead} />
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col min-w-0">
        <MessageThread
          messages={messages}
          sentMessages={searchQuery ? [] : sentMessages}
          isTyping={searchQuery ? false : isTyping}
          onReply={(m) => setReplyTo({ from: m.from, text: m.text })}
        />
      </div>
      {replyTo && (
        <div className="border-t bg-muted/40 px-3 py-2 flex items-start gap-2">
          <Reply className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-emerald-500/70 pl-2">
            <p className="text-[10px] font-semibold text-muted-foreground">
              Respondendo {replyTo.from === "us" ? "sua mensagem" : firstName}
            </p>
            <p className="text-xs text-foreground/80 line-clamp-2 break-words">{replyTo.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="p-1 rounded-full hover:bg-muted shrink-0"
            aria-label="Cancelar resposta"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
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

      <MessageInput
        value={message}
        onChange={setMessage}
        onSend={handleSend}
        onSendFollowUp={handleSendFollowUp}
        onApplyScript={applyScript}
        pendingDef={pendingDef}
        pendingLevel={pendingLevel}
        onSendAudio={handleSendAudio}
        onSendMedia={handleSendMedia}
      />

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
