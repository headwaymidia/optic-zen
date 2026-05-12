import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const queryKey = ["whatsapp_messages", leadId] as const;

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey,
    enabled: !!leadId,
    queryFn: async () => {
      console.log("[useWhatsAppMessages] querying with lead_id =", leadId);
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("lead_id", leadId!)
        .order("timestamp", { ascending: true });
      console.log("[useWhatsAppMessages] leadId:", leadId, "result:", data, "error:", error);
      if (error) throw error;
      return (data ?? []) as WhatsAppMessageRow[];
    },
  });

  useEffect(() => {
    if (!leadId) return;
    const channel = supabase
      .channel(`wa-msgs-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp_messages", leadId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  return { messages, loading: isLoading, refetch };
}
