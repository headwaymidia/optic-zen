import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createReconnectingChannel } from "@/lib/realtime-channel";
import { useRevalidateOnResume } from "@/hooks/useRevalidateOnResume";
import { useStores } from "@/hooks/useStores";

export interface WhatsAppMessageRow {
  id: string;
  store_id: string;
  lead_id: string | null;
  instance_name: string | null;
  remote_jid: string | null;
  message_id: string | null;
  from_me: boolean;
  body: string | null;
  media_type: string | null;
  media_url: string | null;
  timestamp: string;
  status: string | null;
  created_at: string;
}

export function useWhatsAppMessages(leadId: string | undefined) {
  const { currentStoreId } = useStores();
  const [messages, setMessages] = useState<WhatsAppMessageRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  // Token de geração para evitar race conditions ao trocar de conversa rapidamente.
  const reqIdRef = useRef(0);

  const fetchMessages = useCallback(
    async (signal?: AbortSignal) => {
      // Sem leadId/storeId não há o que buscar — garantimos loading=false.
      if (!leadId || !currentStoreId) {
        setMessages([]);
        setLoading(false);
        setError(null);
        return;
      }
      const myReq = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const query = supabase
          .from("whatsapp_messages")
          .select("*")
          .eq("lead_id", leadId)
          .eq("store_id", currentStoreId)
          .order("timestamp", { ascending: true });
        const { data, error: qErr } = signal
          ? await (query as any).abortSignal(signal)
          : await query;
        if (signal?.aborted || myReq !== reqIdRef.current) return;
        if (qErr) throw qErr;
        setMessages((data ?? []) as WhatsAppMessageRow[]);
      } catch (err: any) {
        if (signal?.aborted || myReq !== reqIdRef.current) return;
        if (err?.name === "AbortError") return;
        console.error("[useWhatsAppMessages] erro ao buscar", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setMessages([]);
      } finally {
        // Sempre desliga o loading — sucesso, erro ou abort tardio do request atual.
        if (myReq === reqIdRef.current) setLoading(false);
      }
    },
    [leadId, currentStoreId]
  );

  // Fetch inicial + cleanup (cancela request anterior ao trocar de lead/loja).
  useEffect(() => {
    const controller = new AbortController();
    fetchMessages(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchMessages]);

  // Realtime: escuta TODOS os inserts/updates/deletes em whatsapp_messages
  // (sem filtro por from_me — mensagens enviadas pelo CRM também precisam aparecer).
  useEffect(() => {
    if (!leadId || !currentStoreId) return; // sem store_id nao cria canal (evitava escutar a tabela inteira)
    const channelName = `wa-msgs-${currentStoreId}-${leadId}`;
    const handle = createReconnectingChannel({
      name: channelName,
      onResubscribe: () => fetchMessages(), // ao reconectar, pega o que perdeu
      setup: (ch) => ch.on(
        "postgres_changes",
        // FILTRO no servidor: so as mensagens desta loja. Antes escutava a tabela
        // INTEIRA (86k linhas, todos os clientes) -> sobrecarregava o Realtime
        // e causava "too many database timeouts" cronicos.
        { event: "*", schema: "public", table: "whatsapp_messages", filter: `store_id=eq.${currentStoreId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<WhatsAppMessageRow> | undefined;
          if (!row) return;
          const matchesStore = !currentStoreId || !row.store_id || row.store_id === currentStoreId;
          if (!matchesStore) return;
          // Match pelo lead_id da conversa atual. Quando o lead_id ainda não foi
          // preenchido pela edge function, faz fallback de refetch curto.
          const matchesLead = row.lead_id && row.lead_id === leadId;
          if (!matchesLead) {
            if (payload.eventType === "INSERT") {
              setTimeout(() => fetchMessages(), 600);
            }
            return;
          }

          // Se chegou mensagem recebida (not from_me) enquanto a conversa está aberta,
          // zera o unread automaticamente — sem precisar clicar de novo.
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as Partial<WhatsAppMessageRow> | undefined;
            if (newMsg && newMsg.from_me === false) {
              supabase.rpc("reset_unread", { p_lead_id: leadId }).then(() => {});
            }
          }

          setMessages((old) => {
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Partial<WhatsAppMessageRow> | undefined;
              if (!oldRow?.id) return old;
              return old.filter((m) => m.id !== oldRow.id);
            }
            const newMessage = payload.new as WhatsAppMessageRow | undefined;
            if (!newMessage?.id) return old;
            // Dedup por id OU message_id (evita duplicar quando a row real chega
            // após um insert otimista já persistido com mesmo message_id).
            const idx = old.findIndex(
              (m) =>
                m.id === newMessage.id ||
                (!!newMessage.message_id && m.message_id === newMessage.message_id)
            );
            if (idx >= 0) {
              const next = [...old];
              next[idx] = { ...next[idx], ...newMessage };
              return next;
            }
            const next = [...old, newMessage];
            next.sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            return next;
          });
        }
      ),
    });
    return () => {
      handle.remove();
    };
  }, [leadId, currentStoreId, fetchMessages]);

  const refetch = useCallback(() => fetchMessages(), [fetchMessages]);

  // Ao voltar a aba/app (inclusive mobile: pageshow/online), recarrega as
  // mensagens da conversa aberta — pega o que chegou com o app em background.
  useRevalidateOnResume(() => fetchMessages(), !!leadId);

  return { messages, loading, error, refetch };
}
