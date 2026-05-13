import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WhatsAppProvider = "evolution" | "meta";
export type WhatsAppStatus = "disconnected" | "connecting" | "connected" | "banned";

export interface WhatsAppConnection {
  id: string;
  store_id: string;
  provider: WhatsAppProvider;
  status: WhatsAppStatus;
  phone_number: string | null;
  evolution_instance_name: string | null;
  evolution_api_url: string | null;
  evolution_api_key: string | null;
  meta_phone_number_id: string | null;
  meta_waba_id: string | null;
  meta_access_token: string | null;
  meta_webhook_verify_token: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppConnection(storeId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["whatsapp-connection", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<WhatsAppConnection | null> => {
      const { data, error } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("store_id", storeId!)
        .maybeSingle();
      if (error) throw error;
      return (data as WhatsAppConnection | null) ?? null;
    },
  });

  const upsert = useCallback(
    async (patch: Partial<WhatsAppConnection>) => {
      if (!storeId) return { error: new Error("Loja não selecionada") };
      const payload = { store_id: storeId, ...patch };
      const { error } = await supabase
        .from("whatsapp_connections")
        .upsert(payload, { onConflict: "store_id" });
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", storeId] });
      }
      return { error };
    },
    [storeId, queryClient]
  );

  return { connection: query.data ?? null, loading: query.isLoading, refetch: query.refetch, upsert };
}
