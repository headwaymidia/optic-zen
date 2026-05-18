// Worker: reprocessa mensagens whatsapp_messages com status = 'queued'.
// Disparado por pg_cron a cada 2 minutos. Sem JWT (chamado pelo cron com service role).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function evo(path: string, init: RequestInit = {}) {
  const res = await fetch(`${EVO_URL}${path}`, {
    ...init,
    headers: {
      apikey: EVO_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  let data: any = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const result = { picked: 0, sent: 0, skipped: 0, failed: 0 };

  try {
    if (!EVO_URL || !EVO_KEY) {
      throw new Error("Evolution API não configurada");
    }

    const { data: queued, error: qErr } = await admin
      .from("whatsapp_messages")
      .select("*")
      .eq("status", "queued")
      .eq("from_me", true)
      .order("created_at", { ascending: true })
      .limit(50);
    if (qErr) throw qErr;

    result.picked = queued?.length ?? 0;

    for (const msg of queued ?? []) {
      try {
        // Verifica conexão da loja
        const { data: conn } = await admin
          .from("whatsapp_connections")
          .select("*")
          .eq("store_id", msg.store_id)
          .maybeSingle();

        if (!conn || conn.provider !== "evolution") {
          result.skipped++;
          continue;
        }

        const instance =
          conn.evolution_instance_name ?? `loja-${msg.store_id}`;

        // Confirma estado real na Evolution
        const state = await evo(`/instance/connectionState/${instance}`);
        const evoState = state.data?.instance?.state ?? state.data?.state;
        if (evoState !== "open") {
          result.skipped++;
          continue;
        }

        const remoteJid: string = msg.remote_jid ?? "";
        const phoneDigits = remoteJid.replace(/\D/g, "");
        if (!phoneDigits) {
          result.skipped++;
          continue;
        }

        let send: { status: number; data: any };
        if (msg.media_type === "image" || msg.media_type === "video") {
          if (!msg.media_url) { result.skipped++; continue; }
          // Se media_url é path relativo (novo formato), gera signed URL para Evolution
          let mediaUrl = msg.media_url;
          if (!/^https?:\/\//i.test(mediaUrl)) {
            const { data: signed, error: signErr } = await admin.storage
              .from("whatsapp-media")
              .createSignedUrl(mediaUrl, 60 * 60 * 24);
            if (signErr || !signed?.signedUrl) {
              result.failed++;
              console.warn("[queue-worker] falha ao assinar", mediaUrl, signErr);
              continue;
            }
            mediaUrl = signed.signedUrl;
          }
          send = await evo(`/message/sendMedia/${instance}`, {
            method: "POST",
            body: JSON.stringify({
              number: phoneDigits,
              mediatype: msg.media_type,
              media: mediaUrl,
              caption: msg.body ?? "",
            }),
          });
        } else if (msg.media_type === "audio") {
          // Áudio enfileirado sem base64 não é suportado — pula
          result.skipped++;
          continue;
        } else {
          if (!msg.body) { result.skipped++; continue; }
          send = await evo(`/message/sendText/${instance}`, {
            method: "POST",
            body: JSON.stringify({ number: phoneDigits, text: msg.body }),
          });
        }

        if (send.status >= 400) {
          // Mantém na fila para próxima rodada
          result.failed++;
          console.warn("[queue-worker] send falhou, mantendo queued", {
            id: msg.id, status: send.status, data: send.data,
          });
          continue;
        }

        const newMessageId =
          send.data?.key?.id || send.data?.messageId || send.data?.id || msg.message_id;

        await admin
          .from("whatsapp_messages")
          .update({
            status: "sent",
            message_id: newMessageId,
            timestamp: new Date().toISOString(),
          })
          .eq("id", msg.id);

        if (msg.lead_id) {
          const preview = msg.media_type === "image"
            ? "📷 Imagem"
            : msg.media_type === "video"
            ? "🎬 Vídeo"
            : (msg.body ?? "").slice(0, 100);
          await admin
            .from("leads")
            .update({
              last_message_at: new Date().toISOString(),
              last_message_preview: preview,
            })
            .eq("id", msg.lead_id);
        }

        result.sent++;
      } catch (e) {
        result.failed++;
        console.error("[queue-worker] erro msg", msg.id, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    console.error("[whatsapp-queue-worker]", msg);
    return new Response(JSON.stringify({ error: msg, ...result }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
