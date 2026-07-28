import { useEffect, useMemo, useRef, useState } from "react";
import { Reply, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { validatePhoneBR } from "@/lib/validators";
import { Lead, LeadStatus, supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { ERPTransferCard } from "@/components/ERPTransferCard";
import { StageGateDialog, isGatedStatus, type StageGate } from "@/components/StageGateDialog";
import { LeadHeader } from "@/components/chat/LeadHeader";
import { LeadDropdowns } from "@/components/chat/LeadDropdowns";
import { LeadQuickActions } from "@/components/chat/LeadQuickActions";
import { LeadSections } from "@/components/chat/LeadSections";
import { MessageThread, type ChatMessage, type SentMessage } from "@/components/chat/MessageThread";
import { MessageInput } from "@/components/chat/MessageInput";
import { LeadActivities } from "@/components/chat/LeadActivities";
import { useWhatsAppMessages } from "@/hooks/useWhatsAppMessages";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { useSellerNames } from "@/hooks/useSellerNames";
import { cn } from "@/lib/utils";
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
  initialMessage = "",
  onDraftConsumed,
}: {
  lead: Lead;
  onBack?: () => void;
  onClose?: () => void;
  chatOnly?: boolean;
  initialMessage?: string;
  onDraftConsumed?: () => void;
}) {

  // Aplicar mensagem inicial quando lead muda
  // Lê diretamente do localStorage para evitar race condition com props
  useEffect(() => {
    if (!lead?.id) return;

    // 1. Verificar localStorage (vindo do botão de lembrete no Kanban)
    const savedLeadId = localStorage.getItem("od_draft_lead_id");
    const savedMsg = localStorage.getItem("od_draft_message");
    if (savedLeadId === lead.id && savedMsg) {
      setMessage(savedMsg);
      localStorage.removeItem("od_draft_message");
      localStorage.removeItem("od_draft_lead_id");
      onDraftConsumed?.();
      return;
    }

    // 2. Fallback: usar prop initialMessage
    if (initialMessage) {
      setMessage(initialMessage);
      onDraftConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);
  const { updateStatus, updateLead } = useLeads();
  const { currentStoreId, currentStore } = useStores();
  const { profile } = useAuth();
  const sellerNameById = useSellerNames();
  const { connection } = useWhatsAppConnection(currentStoreId);
  const waFunction = connection?.provider === "meta" ? "whatsapp-meta-send" : "whatsapp-evolution";
  const [message, setMessage] = useState(initialMessage ?? "");
  const [gateStatus, setGateStatus] = useState<StageGate | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  // Lock SÍNCRONO contra double-fire (Enter + click, clique rápido 2-3x).
  // useState é assíncrono — entre 2 cliques o re-render ainda não rodou e o
  // guard `if (isSending) return` passa, disparando 2-3 invokes. Ref resolve.
  const sendingLockRef = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTo, setReplyTo] = useState<{ from: "us" | "lead"; text: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<"chat" | "details">("chat");

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

  const RETRY_DELAYS_MS = [1_500, 3_000];

  // Verifica silenciosamente se o WhatsApp (Evolution) está conectado antes de enviar.
  // Se não estiver, dispara connect e aguarda até 5s. Nunca lança erro para a UI.
  const ensureWhatsAppConnected = async (): Promise<void> => {
    if (!currentStoreId) return;
    if (connection?.provider && connection.provider !== "evolution") return;
    // Se o estado local já diz conectado, não faz chamada extra
    if (connection?.status === "connected") return;
    // "connecting" NAO impede envio: a sessao costuma estar funcional e a Evolution
    // demora a reportar "open". Bloquear/atrasar aqui adicionava ~2s + 3 invokes por
    // envio -> estourava o timeout e mostrava "Falha ao enviar" numa msg que SAIU.
    // Se a sessao estiver mesmo caida, o envio falha adiante e o erro e mostrado.
    if (connection?.status === "connecting") return;
    try {
      const { data: statusData } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "status", store_id: currentStoreId },
      });
      if (statusData?.status === "connected") return;

      // Dispara reconexão sem bloquear
      supabase.functions
        .invoke("whatsapp-evolution", {
          body: { action: "connect", store_id: currentStoreId },
        })
        .catch(() => {});

      // Aguarda até 2s (era 5s — travava o envio com sessão instável)
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const { data: poll } = await supabase.functions.invoke("whatsapp-evolution", {
            body: { action: "status", store_id: currentStoreId },
          });
          if (poll?.status === "connected") return;
        } catch {
          // ignora — segue tentando
        }
      }
    } catch {
      // silencioso — segue tentando enviar mesmo assim
    }
  };

  const updateOptimistic = (id: string, patch: Partial<SentMessage>) => {
    setSentMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const buildRemoteJid = (phone: string) => {
    let digits = phone.replace(/\D/g, "");
    if (!digits.startsWith("55")) digits = `55${digits}`;
    return `${digits}@s.whatsapp.net`;
  };

  const enqueueMessage = async (payload: {
    body: string | null;
    media_type?: string | null;
    media_url?: string | null;
  }) => {
    if (!currentStoreId || !lead.phone) return;
    const instance =
      connection?.evolution_instance_name ?? `loja-${currentStoreId}`;
    await supabase.from("whatsapp_messages").insert({
      store_id: currentStoreId,
      lead_id: lead.id,
      instance_name: instance,
      remote_jid: buildRemoteJid(lead.phone),
      from_me: true,
      body: payload.body,
      media_type: payload.media_type ?? null,
      media_url: payload.media_url ?? null,
      timestamp: new Date().toISOString(),
      status: "queued",
    });
  };

  // Confirma no banco se uma mensagem recem-enviada realmente saiu.
  // Mensagens longas as vezes demoram a confirmar e o invoke() estoura o timeout
  // ANTES da Evolution responder — mas a mensagem JA saiu. Antes de gritar "falhou",
  // verificamos o banco: se a row existe, foi enviada (nao e erro, nao reenviar).
  const confirmSentInDb = async (sinceIso: string): Promise<boolean> => {
    if (!lead?.id || !currentStoreId) return false;
    try {
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("store_id", currentStoreId)
        .eq("from_me", true)
        .gte("created_at", sinceIso)
        .limit(1);
      return !!data && data.length > 0;
    } catch {
      return false;
    }
  };

  const sendWithRetry = async (
    optimisticId: string,
    invoke: () => Promise<void>,
    errorTitle: string,
    onQueue?: () => Promise<void>,
  ): Promise<boolean> => {
    // ENVIO UNICO — nunca reenviar no cliente. Um erro de RESPOSTA nao significa
    // que a mensagem nao saiu; reenviar duplicava (cliente recebia 2-3x).
    const startedAt = new Date(Date.now() - 5000).toISOString(); // margem de 5s
    try {
      await invoke();
      return true;
    } catch (err: any) {
      // A mensagem PODE ter saido mesmo com erro (timeout de confirmacao em msg longa).
      // Antes de mostrar falha: espera um instante e CONFIRMA no banco se ela saiu.
      console.error("[sendWithRetry] invoke lancou erro (verificando se saiu):", err);
      // Da tempo da Edge Function persistir + tenta 2 vezes.
      for (let i = 0; i < 2; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        if (await confirmSentInDb(startedAt)) {
          // Saiu de verdade — trata como sucesso, sem alarme falso.
          updateOptimistic(optimisticId, { status: "sent" });
          return true;
        }
      }
      // Realmente nao chegou no banco — ai sim e falha.
      updateOptimistic(optimisticId, { status: "failed" });
      toast({
        title: errorTitle,
        description: `${humanizeError(err)} — verifique se chegou antes de reenviar.`,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSend = async () => {
    // Validacao ANTES do lock — assim uma validacao que falha nao trava o lock.
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
    const phoneErr = validatePhoneBR(lead.phone);
    if (phoneErr) {
      toast({ title: "Telefone inválido", description: phoneErr, variant: "destructive" });
      return;
    }
    // Lock sincrono: segundo disparo (Enter + clique no mesmo frame) e descartado.
    if (sendingLockRef.current || isSending) return;
    sendingLockRef.current = true;
    const text = replyTo
      ? `> ${replyTo.text.split("\n").join("\n> ")}\n\n${raw}`
      : raw;
    promoteToInAttendance();
    setMessage("");
    setReplyTo(null);
    setIsSending(true);

    const optimisticId = crypto.randomUUID();
    const now = new Date();
    const optimistic: SentMessage = {
      id: optimisticId,
      from: "us",
      text,
      time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      status: "sending",
    };
    setSentMessages((prev) => [...prev, optimistic]);

    const ok = await sendWithRetry(
      optimisticId,
      async () => {
        await ensureWhatsAppConnected();
        const { data, error } = await supabase.functions.invoke(waFunction, {
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
      },
      "Falha ao enviar mensagem",
      async () => enqueueMessage({ body: text }),
    );

    if (ok) {
      // Refetch imediato + retries para cobrir atraso entre invoke() retornar
      // e a Edge Function persistir a linha no banco.
      await refetchMessages();
      setTimeout(() => { refetchMessages(); }, 1000);
      // Remove otimista após refetch
      setTimeout(() => {
        setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }, 1200);
    }
    setIsSending(false);
    sendingLockRef.current = false;
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
    // Lock sincrono: impede envios multiplos da MESMA midia (duplicava no WhatsApp).
    if (sendingLockRef.current) return;
    sendingLockRef.current = true;
    promoteToInAttendance();

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
        status: "sending",
      },
    ]);

    // Upload do audio para o Storage e envio por URL (nao por base64 no corpo).
    // base64 de audio longo (1-2 min) estoura o limite de payload da edge function
    // -> por isso audio longo nao ia. URL e pequena, resolve independente da duracao.
    let audioPublicUrl: string | null = null;
    try {
      // Formato REAL do que foi gravado. Chrome grava webm; Firefox/alguns grava ogg.
      // Forcar ".ogg" num arquivo webm fazia o WhatsApp nao tocar o audio.
      const realType = blob.type || "audio/webm";
      const isOgg = realType.includes("ogg");
      const ext = isOgg ? "ogg" : "webm";
      const path = `${currentStoreId}/audio-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, blob, { contentType: realType, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
      audioPublicUrl = pub?.publicUrl ?? null;
      if (!audioPublicUrl) throw new Error("URL publica indisponivel");
    } catch (e) {
      console.error("[handleSendAudio] upload error:", e);
      toast({ title: "Falha ao preparar o audio para envio", variant: "destructive" });
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      URL.revokeObjectURL(audioUrl);
      sendingLockRef.current = false;
      return;
    }

    const ok = await sendWithRetry(
      optimisticId,
      async () => {
        await ensureWhatsAppConnected();
        const { data, error } = await supabase.functions.invoke(waFunction, {
          body: {
            action: "sendMessage",
            store_id: currentStoreId,
            lead_id: lead.id,
            phone: lead.phone,
            audioMessage: { url: audioPublicUrl, mimetype: isOgg ? "audio/ogg; codecs=opus" : "audio/webm" },
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      },
      "Falha ao enviar áudio",
    );
    if (ok) {
      await refetchMessages();
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      URL.revokeObjectURL(audioUrl); // libera o blob da memoria
    }
    sendingLockRef.current = false;
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
    const isDocument = !isImage && !isVideo; // PDF e demais arquivos
    const kind: "image" | "video" | "document" = isImage ? "image" : isVideo ? "video" : "document";
    const MAX_BYTES = isImage ? 2 * 1024 * 1024 : 50 * 1024 * 1024; // doc usa o limite de 50MB
    if (file.size > MAX_BYTES) {
      const limitLabel = isImage ? "2MB" : "50MB";
      toast({
        title: "Arquivo muito grande",
        description: `O tamanho máximo para ${isImage ? "imagens" : isVideo ? "vídeos" : "arquivos"} é ${limitLabel}.`,
        variant: "destructive",
      });
      return;
    }
    // Lock sincrono: impede envios multiplos da MESMA midia (imagem duplicava no WhatsApp).
    if (sendingLockRef.current) return;
    sendingLockRef.current = true;
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
        media_type: kind,
        media_url: localUrl,
        status: "sending",
      },
    ]);

    // 1) Upload para o Storage e obtenção da URL pública.
    let publicMediaUrl: string | null = null;
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : (isImage ? "jpg" : isVideo ? "mp4" : "bin");
      const path = `${currentStoreId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        console.error("[handleSendMedia] upload erro", upErr);
        throw upErr;
      }
      const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
      publicMediaUrl = pub?.publicUrl ?? null;
      if (!publicMediaUrl) throw new Error("URL pública indisponível");
    } catch (e) {
      console.error("[handleSendMedia] upload error:", e);
      toast({ title: "Falha ao enviar mídia para o storage", variant: "destructive" });
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      sendingLockRef.current = false;
      return;
    }

    const ok = await sendWithRetry(
      optimisticId,
      async () => {
        await ensureWhatsAppConnected();
        const payload = {
          action: "sendMessage",
          store_id: currentStoreId,
          lead_id: lead.id,
          phone: lead.phone,
          mediaUrl: publicMediaUrl,
          mediaType: kind,
          mimetype: file.type,
          fileName: file.name,
          caption: "",
        };
        const { data, error } = await supabase.functions.invoke(waFunction, { body: payload });
        if (error) {
          console.error("[handleSendMedia] evolution erro", error);
          throw error;
        }
        if (data?.error) {
          console.error("[handleSendMedia] evolution erro", data.error);
          throw new Error(data.error);
        }
      },
      isImage ? "Falha ao enviar imagem" : isVideo ? "Falha ao enviar vídeo" : "Falha ao enviar arquivo",
    );


    if (ok) {
      await refetchMessages();
      setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      URL.revokeObjectURL(localUrl); // libera o blob da memoria
    }
    sendingLockRef.current = false;
  };

  const handleApplyFollowUpScript = () => {
    if (!pendingDef) return;
    setMessage(pendingDef.buildScript(firstName));
  };

  const handleSendFollowUp = async () => {
    if (!message.trim() || !pendingDef) return;
    if (!currentStoreId) {
      toast({ title: "Selecione uma loja antes de enviar", variant: "destructive" });
      return;
    }
    if (!lead.phone) {
      toast({ title: "Lead sem telefone", variant: "destructive" });
      return;
    }
    const phoneErr = validatePhoneBR(lead.phone);
    if (phoneErr) {
      toast({ title: "Telefone inválido", description: phoneErr, variant: "destructive" });
      return;
    }
    if (sendingLockRef.current || isSending) return;
    sendingLockRef.current = true;
    const text = message.trim();
    const now = new Date();

    promoteToInAttendance();
    setMessage("");
    setIsSending(true);

    const optimisticId = crypto.randomUUID();
    setSentMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        from: "us",
        text,
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        status: "sending",
      },
    ]);

    // ENVIO ÚNICO via edge function (que persiste em whatsapp_messages).
    const ok = await sendWithRetry(
      optimisticId,
      async () => {
        await ensureWhatsAppConnected();
        const { data, error } = await supabase.functions.invoke(waFunction, {
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
      },
      "Falha ao enviar follow-up",
      async () => enqueueMessage({ body: text }),
    );

    if (ok) {
      await refetchMessages();
      setTimeout(() => { refetchMessages(); }, 1000);
      setTimeout(() => {
        setSentMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }, 1200);

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
    }
    setIsSending(false);
    sendingLockRef.current = false;
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
    dateISO: m.timestamp,
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
        <div className="mt-2">
          <LeadQuickActions lead={lead} onApplyLabScript={(msg) => setMessage(msg)} />
        </div>
      </header>

      {/* Mobile-only tab switcher */}
      {!chatOnly && (
        <div className="md:hidden shrink-0 border-b bg-card flex">
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors border-b-2",
              mobileTab === "chat"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            💬 Chat
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("details")}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors border-b-2",
              mobileTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            📋 Detalhes
          </button>
        </div>
      )}

      {lead.lab_status === "Pronto no laboratório" && (
        <div className="shrink-0 border-b bg-amber-100 dark:bg-amber-900/30 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
          <span>⚠️ Pedido pronto — avisar o cliente</span>
        </div>
      )}

      {/* Main split: chat (center) + details aside (right on desktop) */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row min-w-0 overflow-hidden">
        {/* Chat column */}
        <div
          className={cn(
            "flex-1 min-h-0 min-w-0 flex-col",
            "md:flex",
            !chatOnly && mobileTab === "chat" ? "flex" : "hidden",
            chatOnly && "flex"
          )}
        >
          <div className="flex-1 min-h-0 flex flex-col min-w-0">
            <MessageThread
              messages={messages}
              sentMessages={searchQuery ? [] : sentMessages}
              isTyping={searchQuery ? false : isTyping}
              onReply={(m) => setReplyTo({ from: m.from, text: m.text })}
              onRetry={async (m) => {
                if (!m.id) return;
                // Guard sincrono: evita reenvio multiplo em cliques rapidos.
                if (sendingLockRef.current) return;
                sendingLockRef.current = true;
                updateOptimistic(m.id, { status: "sending" });
                const textToSend = m.text ?? "";
                const ok = await sendWithRetry(
                  m.id,
                  async () => {
                    await ensureWhatsAppConnected();
                    const { data, error } = await supabase.functions.invoke(waFunction, {
                      body: {
                        action: "sendMessage",
                        store_id: currentStoreId,
                        lead_id: lead.id,
                        phone: lead.phone,
                        message: textToSend,
                      },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                  },
                  "Falha ao reenviar mensagem",
                  async () => enqueueMessage({ body: textToSend }),
                );
                if (ok) {
                  await refetchMessages();
                  setTimeout(() => {
                    setSentMessages((prev) => prev.filter((msg) => msg.id !== m.id));
                  }, 2000);
                }
                sendingLockRef.current = false;
              }}
              leadId={lead.id}
            />
          </div>
          {replyTo && (
            <div className="shrink-0 border-t bg-muted/40 px-3 py-2 flex items-start gap-2">
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
            <div className="shrink-0 border-t bg-amber-50 dark:bg-amber-900/20 px-3 py-2 flex items-center gap-2">
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
            <div className="shrink-0 border-t bg-red-50 dark:bg-red-900/20 px-3 py-2 text-[11px] text-red-800 dark:text-red-200">
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
            isSending={isSending}
            storeId={currentStoreId}
            leadName={lead.name?.split(" ")[0] ?? null}
            canEdit={currentStore?.role === "Dono" || currentStore?.role === "Gerente"}
            vendedorName={(
              lead.responsible_id
                ? sellerNameById.get(lead.responsible_id)?.split(" ")[0]
                : profile?.full_name?.split(" ")[0]
            ) ?? null}
            storeName={currentStore?.name ?? null}
          />
        </div>

        {/* Details aside: right column on desktop, full panel on mobile when tab=details */}
        {!chatOnly && (
          <aside
            className={cn(
              "min-h-0 overflow-y-auto bg-card",
              "md:block md:w-[320px] xl:w-[360px] md:shrink-0 md:border-l md:border-t-0",
              "border-t",
              mobileTab === "details" ? "flex-1 block" : "hidden"
            )}
          >
            <LeadSections lead={lead} onApplyLabScript={(msg) => setMessage(msg)} />
            <LeadActivities leadId={lead.id} />
            <ERPTransferCard lead={lead} />
          </aside>
        )}
      </div>

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
