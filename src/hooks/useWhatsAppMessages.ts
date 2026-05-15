import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const { currentStoreId } = useStores();
  const queryKey = ["whatsapp_messages", currentStoreId, leadId] as const;

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey,
    enabled: !!leadId,
    queryFn: async () => {
      if (import.meta.env.DEV) console.log("[useWhatsAppMessages] querying with lead_id =", leadId);
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("lead_id", leadId!)
        .order("timestamp", { ascending: true });
      if (import.meta.env.DEV) console.log("[useWhatsAppMessages] leadId:", leadId, "result:", data, "error:", error);
      if (error) throw error;
      return (data ?? []) as WhatsAppMessageRow[];
    },
  });

  useEffect(() => {
    if (!leadId) return;
    // Canal único por (store, lead). Realtime aceita apenas 1 expressão de filtro,
    // então filtramos por lead_id e validamos store_id no handler.
    const channelName = `wa-msgs-${currentStoreId ?? "no-store"}-${leadId}`;
    if (import.meta.env.DEV) {
      console.log("[useWhatsAppMessages] subscribing channel", channelName, {
        storeId: currentStoreId,
        leadId,
      });
    }
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<WhatsAppMessageRow> | undefined;
          if (currentStoreId && row?.store_id && row.store_id !== currentStoreId) {
            if (import.meta.env.DEV) {
              console.log("[useWhatsAppMessages] payload de outra loja ignorado", row.store_id);
            }
            return;
          }
          if (import.meta.env.DEV) {
            console.log("[useWhatsAppMessages] realtime payload", payload.eventType, row);
          }

          // IMPORTANTE: usar a MESMA referência de queryKey que o useQuery acima,
          // para garantir que o setQueryData escreve na mesma entrada de cache que o
          // componente lê. Nunca substituir o array — sempre fazer append/upsert.
          queryClient.setQueryData<WhatsAppMessageRow[]>(queryKey, (old) => {
            const list = old ?? [];
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Partial<WhatsAppMessageRow> | undefined;
              if (!oldRow?.id) return list;
              return list.filter((m) => m.id !== oldRow.id);
            }
            const newMessage = payload.new as WhatsAppMessageRow | undefined;
            if (!newMessage?.id) return list;
            // Upsert: se a mensagem já existe (por id ou message_id), atualiza in-place
            const idx = list.findIndex(
              (m) =>
                m.id === newMessage.id ||
                (newMessage.message_id && m.message_id && m.message_id === newMessage.message_id)
            );
            if (idx >= 0) {
              const next = list.slice();
              next[idx] = { ...list[idx], ...newMessage };
              return next;
            }
            // INSERT: append preservando o array existente (NUNCA substituir)
            const next = [...list, newMessage];
            next.sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            return next;
          });
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log("[useWhatsAppMessages] subscription status:", status, channelName);
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, currentStoreId, queryClient]);

  return { messages, loading: isLoading, refetch };
}
