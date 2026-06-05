import { useEffect } from "react";
import { usePushNotifications } from "./usePushNotifications";
import { useStores } from "./useStores";

const PROMPT_KEY = "od.push.prompted.v1";

export function useAutoPushPrompt() {
  const { permission, subscribed, isSupported, subscribe } = usePushNotifications();
  const { currentStoreId } = useStores();

  useEffect(() => {
    if (!isSupported) return;
    if (!currentStoreId) return;
    if (subscribed) return;
    if (permission === "denied") return;
    if (permission === "granted") {
      subscribe();
      return;
    }
    try {
      if (localStorage.getItem(PROMPT_KEY) === "1") return;
    } catch {}
    const timer = setTimeout(() => {
      try { localStorage.setItem(PROMPT_KEY, "1"); } catch {}
      subscribe();
    }, 3000);
    return () => clearTimeout(timer);
  }, [isSupported, currentStoreId, subscribed, permission, subscribe]);
}
