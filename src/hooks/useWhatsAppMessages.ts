import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  // Realtime: aplica patches locais sem refazer fetch.
  useEffect(() => {
    if (!leadId) return;
    const channelName = `wa-msgs-${currentStoreId ?? "no-store"}-${leadId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<WhatsAppMessageRow> | undefined;
          if (!row) return;
          // Aceita tanto mensagens recebidas quanto enviadas (from_me=true).
          // Match por lead_id quando presente; quando ausente (edge function pode
          // inserir sem lead_id), faz fallback de refetch para garantir consistência.
          const matchesLead = row.lead_id && row.lead_id === leadId;
          const matchesStore = !currentStoreId || !row.store_id || row.store_id === currentStoreId;
          if (!matchesStore) return;
          if (!matchesLead) {
            // Pode ser uma linha sem lead_id ainda — agenda refetch curto.
            if (row.store_id === currentStoreId && payload.eventType === "INSERT") {
              setTimeout(() => fetchMessages(), 600);
            }
            return;
          }

          setMessages((old) => {
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Partial<WhatsAppMessageRow> | undefined;
              if (!oldRow?.id) return old;
              return old.filter((m) => m.id !== oldRow.id);
            }
            const newMessage = payload.new as WhatsAppMessageRow | undefined;
            if (!newMessage?.id) return old;
            const idx = old.findIndex((m) => m.id === newMessage.id);
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
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, currentStoreId, fetchMessages]);

  const refetch = useCallback(() => fetchMessages(), [fetchMessages]);

  return { messages, loading, error, refetch };
}
