import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";
import { toast } from "@/components/ui/use-toast";

// VAPID public key — de env (fallback pro valor do projeto pra nao quebrar em prod).
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ??
  "BO-_p-meX8WIzlJcL3kYP-shdlE5BLfI6EIHiD_50NRB1DisjWSiGvLB0mdwZOVXzxf4s8Y3sBa-_HYmUCNgStY";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const { currentStoreId } = useStores();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // iOS so suporta Web Push se o site estiver INSTALADO na tela inicial (standalone).
  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true);
  const iosNeedsInstall = isIOS && !isStandalone;

  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);

    // Verificar se já está inscrito
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => {});
  }, [isSupported]);

  // Registrar service worker
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[push] falha ao registrar sw:", err);
    });

    // Ouvir mensagens do SW para navegar
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "navigate" && event.data?.url) {
        window.location.href = event.data.url;
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !currentStoreId) return;
    // iOS: sem instalar na tela inicial, o push nao funciona — orienta em vez de falhar mudo.
    if (iosNeedsInstall) {
      toast({
        title: "Instale o app primeiro",
        description: "No iPhone: toque em Compartilhar → 'Adicionar à Tela de Início', abra pelo ícone e ative as notificações por lá.",
      });
      return;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);

      if (perm !== "granted") {
        toast({
          title: "Notificações bloqueadas",
          description: "Permita notificações nas configurações do navegador.",
          variant: "destructive",
        });
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Salvar subscrição no Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const subJson = sub.toJSON();
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        store_id: currentStoreId,
        endpoint: subJson.endpoint,
        p256dh: (subJson.keys as any)?.p256dh ?? "",
        auth: (subJson.keys as any)?.auth ?? "",
        user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: "user_id,store_id,endpoint" });

      setSubscribed(true);
      toast({ title: "Notificações ativadas! 🔔", description: "Você receberá alertas de novas mensagens." });
    } catch (err: any) {
      console.error("[push] subscribe error:", err);
      toast({ title: "Erro ao ativar notificações", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isSupported, currentStoreId]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", sub.endpoint);
        }
      }
      setSubscribed(false);
      toast({ title: "Notificações desativadas" });
    } catch (err: any) {
      console.error("[push] unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return { permission, subscribed, loading, isSupported, iosNeedsInstall, subscribe, unsubscribe };
}
