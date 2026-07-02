import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Canal de realtime que reconecta sozinho quando a conexao cai — mas com
 * salvaguardas contra LOOP (importante quando o servico Realtime do Supabase
 * esta instavel: sem cuidado, erro->reconecta->erro vira loop e a UI "pisca").
 *
 * Salvaguardas:
 * - onResubscribe SO dispara em RE-conexao (nao na 1a), evitando refetch em
 *   cadeia logo na montagem.
 * - backoff exponencial comeca em 2s e vai ate 60s (nao martela o servidor).
 * - teto de tentativas: apos MAX_RETRIES desiste (evita loop infinito); a rede
 *   de seguranca (useRevalidateOnResume) cobre a re-sincronizacao ao voltar a aba.
 */
export function createReconnectingChannel(opts: {
  name: string;
  setup: (channel: RealtimeChannel) => RealtimeChannel;
  onResubscribe?: () => void;
}) {
  const MAX_RETRIES = 6;
  let channel: RealtimeChannel | null = null;
  let retry = 0;
  let hasConnectedOnce = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let removed = false;

  const connect = () => {
    if (removed) return;
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    const ch = opts.setup(supabase.channel(opts.name));
    channel = ch;
    ch.subscribe((status) => {
      if (removed) return;
      if (status === "SUBSCRIBED") {
        // So revalida se for RE-conexao (nao na primeira) — evita refetch em cadeia.
        if (hasConnectedOnce) {
          opts.onResubscribe?.();
        }
        hasConnectedOnce = true;
        retry = 0;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (retry >= MAX_RETRIES) return; // desiste — evita loop infinito
        const delay = Math.min(2000 * 2 ** retry, 60_000);
        retry += 1;
        if (timer) clearTimeout(timer);
        timer = setTimeout(connect, delay);
      }
      // CLOSED: nao reconecta automaticamente (normalmente e fechamento proposital
      // ou cleanup; reconectar aqui e o que causava loop).
    });
  };

  connect();

  return {
    remove: () => {
      removed = true;
      if (timer) clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
      channel = null;
    },
  };
}
