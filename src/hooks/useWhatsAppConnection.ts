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

const EVOLUTION_FN_URL =
  "https://fxcgvlukzjmwzpzuvzcp.supabase.co/functions/v1/whatsapp-evolution";
const PUBLISHABLE_KEY = "sb_publishable_BgnFYgwfBCXxZcqO2rQJWA_qDAjT4_R";

async function callEvolution(action: "status" | "connect", storeId: string) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  if (!token) throw new Error("Sessão expirada");

  const res = await fetch(EVOLUTION_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, store_id: storeId }),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}

function isConnectedResponse(res: any): boolean {
  const state =
    res?.instance?.state ?? res?.state ?? res?.instance?.status ?? res?.status;
  return state === "open" || state === "connected";
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

  // Health check: poll Evolution status a cada 30s e tenta auto-reconectar se cair.
  const prevStatusRef = useRef<WhatsAppStatus | null>(null);
  const reconnectingRef = useRef(false);
  const provider = query.data?.provider;

  useEffect(() => {
    if (!storeId) return;
    // Só para Evolution (provider Meta não tem QR/reconnect deste tipo)
    if (provider && provider !== "evolution") return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.hidden) return;
      try {
        const res = await callEvolution("status", storeId);
        const connected = isConnectedResponse(res);
        const newStatus: WhatsAppStatus = connected ? "connected" : "disconnected";
        const prev = prevStatusRef.current;

        // Atualiza cache do React Query (server-side já fez upsert via service_role).
        await queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", storeId] });

        // Detecta queda: estava connected e agora não está.
        if (prev === "connected" && newStatus !== "connected" && !reconnectingRef.current) {
          reconnectingRef.current = true;
          toast({
            title: "WhatsApp desconectado",
            description: "Detectamos queda da conexão. Tentando reconectar automaticamente…",
            variant: "destructive",
          });
          try {
            await callEvolution("connect", storeId);
            await queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", storeId] });
          } catch (e) {
            console.error("[whatsapp health] auto-reconnect falhou", e);
          } finally {
            reconnectingRef.current = false;
          }
        }

        // Reconexão bem-sucedida
        if (prev && prev !== "connected" && newStatus === "connected") {
          toast({
            title: "WhatsApp reconectado",
            description: "Conexão restaurada com sucesso.",
          });
        }

        prevStatusRef.current = newStatus;
      } catch (e) {
        // Silencioso — falha de rede pontual não deve poluir UI
        if (import.meta.env.DEV) console.warn("[whatsapp health] tick error", e);
      }
    };

    // Primeiro tick imediato para popular prevStatusRef e depois a cada 30s
    tick();
    const id = window.setInterval(tick, 30000);

    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [storeId, provider, queryClient]);

  return { connection: query.data ?? null, loading: query.isLoading, refetch: query.refetch, upsert };
}
