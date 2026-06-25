import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Camada de notificação para mensagens recebidas (from_me=false) via realtime.
 * - Toca um beep curto (WebAudio, sem asset).
 * - Pisca o título da aba quando document.hidden === true.
 * - Para de piscar e zera o contador quando a aba volta ao foco.
 * Não altera nenhuma lógica de envio nem o realtime existente.
 */
export function useIncomingMessageNotifier(storeId: string | null | undefined) {
  const unreadRef = useRef(0);
  const blinkTimerRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== "undefined" ? document.title : "");
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Evita tocar/contar a mesma mensagem duas vezes se o realtime reenviar o INSERT.
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Mantém o título "base" sincronizado caso a app o atualize por conta própria.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const obs = new MutationObserver(() => {
      if (blinkTimerRef.current == null) {
        originalTitleRef.current = document.title;
      }
    });
    const titleEl = document.querySelector("title");
    if (titleEl) obs.observe(titleEl, { childList: true });
    return () => obs.disconnect();
  }, []);

  const playBeep = () => {
    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current!;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      /* silencioso — som é melhoria, não crítico */
    }
  };

  const stopBlink = () => {
    if (blinkTimerRef.current != null) {
      window.clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }
    unreadRef.current = 0;
    if (originalTitleRef.current) document.title = originalTitleRef.current;
  };

  const startBlink = () => {
    if (blinkTimerRef.current != null) {
      // Apenas atualiza o título "alt" — o intervalo já está rodando.
      return;
    }
    // Captura o título atual como base antes de começar a piscar.
    originalTitleRef.current = document.title;
    let showAlt = true;
    blinkTimerRef.current = window.setInterval(() => {
      const count = unreadRef.current;
      if (count <= 0) {
        stopBlink();
        return;
      }
      document.title = showAlt
        ? `(${count}) Nova mensagem`
        : originalTitleRef.current;
      showAlt = !showAlt;
    }, 1000);
  };

  // Volta o foco -> para de piscar.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) stopBlink();
    };
    const onFocus = () => stopBlink();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Assina inserts de whatsapp_messages da loja atual.
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`wa-notify-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const row = payload.new as
            | { id?: string; from_me?: boolean }
            | undefined;
          if (!row || row.from_me !== false) return;
          if (row.id) {
            if (seenIdsRef.current.has(row.id)) return;
            seenIdsRef.current.add(row.id);
            // Limpa cache se crescer demais.
            if (seenIdsRef.current.size > 500) {
              seenIdsRef.current = new Set(
                Array.from(seenIdsRef.current).slice(-250)
              );
            }
          }
          playBeep();
          if (document.hidden) {
            unreadRef.current += 1;
            startBlink();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  // Cleanup global ao desmontar.
  useEffect(() => {
    return () => stopBlink();
  }, []);
}
