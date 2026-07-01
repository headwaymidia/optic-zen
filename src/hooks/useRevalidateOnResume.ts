import { useEffect } from "react";

/**
 * Revalida dados quando a aba/app volta a ficar ativo — cobrindo os eventos
 * que importam no MOBILE, nao so no desktop.
 *
 * Por que varios eventos:
 * - visibilitychange: aba volta a ficar visivel (desktop + mobile).
 * - focus: janela recebe foco (confiavel no desktop, menos no mobile).
 * - pageshow (persisted): CRITICO no mobile — quando o navegador restaura a
 *   pagina do bfcache (cache congelado) ao voltar pro app, dispara SO pageshow.
 *   Sem isto, a pagina volta "viva" mas com o websocket morto e sem revalidar.
 * - online: celular recuperou conexao (ex: saiu do wifi -> 4G). O realtime
 *   precisa saber que a rede voltou.
 *
 * Uso: useRevalidateOnResume(() => refetch(), enabled);
 */
export function useRevalidateOnResume(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const run = () => callback();

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      // persisted = restaurada do bfcache (caso mobile mais comum)
      if (e.persisted) run();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", run);
    window.addEventListener("pageshow", onPageShow as EventListener);
    window.addEventListener("online", run);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", onPageShow as EventListener);
      window.removeEventListener("online", run);
    };
  }, [callback, enabled]);
}
