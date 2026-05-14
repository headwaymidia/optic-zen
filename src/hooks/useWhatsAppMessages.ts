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
          queryClient.invalidateQueries({ queryKey: ["whatsapp_messages", currentStoreId, leadId] });
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
