import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Cria um canal de realtime que se RECONECTA sozinho quando a conexao cai.
 *
 * Problema que isto resolve: `channel.subscribe()` puro nao reconecta de forma
 * confiavel quando o websocket morre (rede oscila, aba em background, servidor
 * reinicia, incidente de capacidade). O canal entra em CHANNEL_ERROR/TIMED_OUT/
 * CLOSED e para de receber eventos silenciosamente — o app "acha" que ouve, mas
 * nao ouve. Sintoma: mensagens chegam no banco mas nao aparecem ate dar F5.
 *
 * Uso:
 *   const handle = createReconnectingChannel({
 *     name: `leads-${storeId}`,
 *     setup: (ch) => ch.on("postgres_changes", {...}, handler),
 *     onResubscribe: () => refetch(), // opcional: revalida ao reconectar (pega o que perdeu)
 *   });
 *   return () => handle.remove();
 */
export function createReconnectingChannel(opts: {
  name: string;
  setup: (channel: RealtimeChannel) => RealtimeChannel;
  onResubscribe?: () => void;
}) {
  let channel: RealtimeChannel | null = null;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let removed = false;

  const connect = () => {
    if (removed) return;
    // limpa canal anterior antes de recriar
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    const ch = opts.setup(supabase.channel(opts.name));
    channel = ch;
    ch.subscribe((status) => {
      if (removed) return;
      if (status === "SUBSCRIBED") {
        retry = 0;
        // Ao (re)conectar, revalida os dados: cobre o que chegou enquanto
        // o canal estava caido.
        opts.onResubscribe?.();
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        // backoff exponencial com teto de 30s
        const delay = Math.min(1000 * 2 ** retry, 30_000);
        retry += 1;
        if (timer) clearTimeout(timer);
        timer = setTimeout(connect, delay);
      }
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
