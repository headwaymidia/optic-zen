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
const MAX_RETRIES = 10; // Após 10 tentativas, marca como failed

// Throttle — protege contra ban do WhatsApp
// 1.2s entre mensagens da MESMA instância é a taxa segura
// Não há limite de volume — cada loja processa tudo em fila ordenada
const DELAY_BETWEEN_MSGS_MS = 1200;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));


// Fetch com timeout para evitar travamentos esperando Evolution API
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function evo(path: string, init: RequestInit = {}) {
  const res = await fetchWithTimeout(`${EVO_URL}${path}`, {
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
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(200);
    if (qErr) throw qErr;

    result.picked = queued?.length ?? 0;

    // Agrupar por instância para aplicar throttle correto
    const byInstance = new Map<string, typeof queued>();
    for (const msg of queued ?? []) {
      const key = msg.store_id;
      if (!byInstance.has(key)) byInstance.set(key, []);
      byInstance.get(key)!.push(msg);
    }

    // Processar lojas em paralelo — cada loja tem seu próprio throttle
    // Isso garante que loja A não bloqueia loja B
    const storeResults = await Promise.all(
      Array.from(byInstance.entries()).map(async ([storeId, msgs]) => {
        const storeResult = { sent: 0, skipped: 0, failed: 0 };

        // Verificar conexão uma vez por loja
        const { data: conn } = await admin
          .from("whatsapp_connections")
          .select("*")
          .eq("store_id", storeId)
          .maybeSingle();

        if (!conn || conn.provider !== "evolution") {
          storeResult.skipped += msgs.length;
          return storeResult;
        }

        const instance = conn.evolution_instance_name ?? `loja-${storeId}`;

        // Verificar estado da Evolution uma vez por loja
        const state = await evo(`/instance/connectionState/${instance}`);
        const evoState = state.data?.instance?.state ?? state.data?.state;
        if (evoState !== "open") {
          storeResult.skipped += msgs.length;
          return storeResult;
        }

        console.log(`[queue-worker] loja ${storeId}: ${msgs.length} mensagens`);
        let sentThisBatch = 0;

        for (const msg of msgs) {
        try {
          const remoteJid: string = msg.remote_jid ?? "";
          const phoneDigits = remoteJid.replace(/\D/g, "");
          if (!phoneDigits) {
            storeResult.skipped++;
            continue;
          }

          // ⏱ Throttle: 1.2s entre mensagens da mesma instância
          if (sentThisBatch > 0) {
            await sleep(DELAY_BETWEEN_MSGS_MS);
          }

        let send: { status: number; data: any };
        if (msg.media_type === "image" || msg.media_type === "video") {
          if (!msg.media_url) { storeResult.skipped++; continue; }
          send = await evo(`/message/sendMedia/${instance}`, {
            method: "POST",
            body: JSON.stringify({
              number: phoneDigits,
              mediatype: msg.media_type,
              media: msg.media_url,
              caption: msg.body ?? "",
            }),
          });
        } else if (msg.media_type === "audio") {
          // Áudio enfileirado sem base64 não é suportado — pula
          storeResult.skipped++;
          continue;
        } else {
          if (!msg.body) { storeResult.skipped++; continue; }
          send = await evo(`/message/sendText/${instance}`, {
            method: "POST",
            body: JSON.stringify({ number: phoneDigits, text: msg.body }),
          });
        }

        if (send.status >= 400) {
          storeResult.failed++;
          const newRetryCount = (msg.retry_count ?? 0) + 1;

          // Detectar número inválido / não cadastrado no WhatsApp
          const errorMsg = JSON.stringify(send.data ?? "").toLowerCase();
          const isInvalidNumber =
            send.status === 400 && (
              errorMsg.includes("not on whatsapp") ||
              errorMsg.includes("phone number does not exist") ||
              errorMsg.includes("invalid phone") ||
              errorMsg.includes("jid inválido") ||
              errorMsg.includes("bad jid")
            );

          if (isInvalidNumber) {
            // Número não existe no WhatsApp — não adianta tentar de novo
            await admin.from("whatsapp_messages").update({
              status: "failed",
              retry_count: newRetryCount,
              failed_at: new Date().toISOString(),
            }).eq("id", msg.id);

            // Marcar o lead com aviso de número inválido
            if (msg.lead_id) {
              await admin.from("leads").update({
                notes: "⚠️ Número não encontrado no WhatsApp. Verifique o contato.",
              }).eq("id", msg.lead_id).is("notes", null); // Só atualiza se não tiver nota
            }

            console.warn("[queue-worker] número inválido no WhatsApp:", phoneDigits, "lead:", msg.lead_id);
            continue;
          }

          if (newRetryCount >= MAX_RETRIES) {
            await admin.from("whatsapp_messages").update({
              status: "failed",
              retry_count: newRetryCount,
              failed_at: new Date().toISOString(),
            }).eq("id", msg.id);
            console.error("[queue-worker] dead letter após", MAX_RETRIES, "tentativas:", msg.id);
          } else {
            await admin.from("whatsapp_messages").update({
              retry_count: newRetryCount,
            }).eq("id", msg.id);
            console.warn("[queue-worker] send falhou, tentativa", newRetryCount, "de", MAX_RETRIES, { id: msg.id, status: send.status });
          }
          continue;
        }

        const sendStatusStr = String(send.data?.status ?? "").toUpperCase();
        if (sendStatusStr === "PENDING") {
          storeResult.failed++;
          const newRetryCount = (msg.retry_count ?? 0) + 1;
          evo(`/instance/connect/${instance}`, { method: "GET" }).catch(() => {});
          if (newRetryCount >= MAX_RETRIES) {
            await admin.from("whatsapp_messages").update({
              status: "failed", retry_count: newRetryCount, failed_at: new Date().toISOString(),
            }).eq("id", msg.id);
            console.error("[queue-worker] PENDING dead letter:", msg.id);
          } else {
            await admin.from("whatsapp_messages").update({
              retry_count: newRetryCount,
            }).eq("id", msg.id);
            console.warn("[queue-worker] PENDING mantem na fila, tentativa", newRetryCount);
          }
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

          sentThisBatch++;
          storeResult.sent++;
        } catch (e) {
          storeResult.failed++;
          console.error("[queue-worker] erro msg", msg.id, e);
        }
        } // end for msg
        return storeResult;
      }) // end map
    ); // end Promise.all

    // Consolidar resultados
    for (const sr of storeResults) {
      result.sent += sr.sent;
      result.skipped += sr.skipped;
      result.failed += sr.failed;
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
