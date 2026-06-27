import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

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

// (codigo morto removido: callEvolution + isConnectedResponse duplicado +
//  URL/chave hardcoded — nada disso era usado neste hook.)

export function useWhatsAppConnection(storeId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["whatsapp-connection", storeId],
    enabled: !!storeId,
    // React Query deduplica: mesmo que 3 componentes usem este hook,
    // só 1 request é feito a cada intervalo.
    refetchInterval: 30000,
    refetchIntervalInBackground: false, // Não pollar quando aba está escondida
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

  // Detecção de queda: avisa quando status muda de connected para outro.
  // Sem auto-reconexão — evita loop de ban no WhatsApp.
  const prevStatusRef = useRef<WhatsAppStatus | null>(null);
  const provider = query.data?.provider;
  const currentStatus = query.data?.status ?? null;

  useEffect(() => {
    if (!currentStatus) return;
    const prev = prevStatusRef.current;
    if (prev === "connected" && currentStatus !== "connected") {
      toast({
        title: "WhatsApp desconectado",
        description: "Acesse Configurações → WhatsApp para reconectar.",
        variant: "destructive",
      });
    }
    prevStatusRef.current = currentStatus;
  }, [currentStatus]);

  return { connection: query.data ?? null, loading: query.isLoading, refetch: query.refetch, upsert };
}
