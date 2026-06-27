import { useEffect } from "react";
import { usePushNotifications } from "./usePushNotifications";
import { useStores } from "./useStores";


export function useAutoPushPrompt() {
  const { permission, subscribed, isSupported, subscribe } = usePushNotifications();
  const { currentStoreId } = useStores();

  useEffect(() => {
    if (!isSupported) return;
    if (!currentStoreId) return;
    if (subscribed) return;
    // SO re-inscreve automaticamente se a permissao JA foi concedida antes
    // (nao mostra popup nenhum — seguro).
    if (permission === "granted") {
      subscribe();
    }
    // Quando a permissao ainda e "default", NAO pedimos automaticamente:
    // navegadores penalizam pedido sem gesto do usuario, e o popup "do nada"
    // faz muita gente clicar em Bloquear (mata o push pra sempre).
    // A ativacao acontece pelo sininho (PushNotificationBell), que tem o clique.
  }, [isSupported, currentStoreId, subscribed, permission, subscribe]);
}
