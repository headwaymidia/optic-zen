import { useEffect, useRef } from "react";

/**
 * Revalida dados quando a aba/app volta a ficar ativo — cobrindo os eventos
 * que importam no MOBILE, nao so no desktop (pageshow/bfcache, online).
 *
 * IMPORTANTE: usa uma ref para o callback, de modo que os listeners sejam
 * registrados UMA vez so. Se dependessemos do callback direto no useEffect,
 * uma arrow function inline (recriada a cada render) faria o efeito re-rodar
 * sem parar -> loop de refetch (a lista "piscando"/recarregando sem parar).
 */
export function useRevalidateOnResume(callback: () => void, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback; // sempre o callback mais recente, sem re-registrar

  useEffect(() => {
    if (!enabled) return;

    const run = () => cbRef.current();

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) run(); // restaurada do bfcache (mobile)
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow as EventListener);
    window.addEventListener("online", run);
    // NAO escutamos "focus": no desktop ele dispara junto com visibilitychange
    // (redundante) e em alguns navegadores dispara em excesso -> risco de loop.

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow as EventListener);
      window.removeEventListener("online", run);
    };
  }, [enabled]); // depende SO de enabled — listeners registrados uma vez
}
