import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY");
const SUPABASE_ANON = Deno.env.get("ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Fetch com timeout para evitar Edge Function travada esperando Evolution
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
function digitsOnly(s) {
  return (s ?? "").replace(/\D/g, "");
}
function extractText(message) {
  if (!message) return "";
  return message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || message.videoMessage?.caption || message.documentMessage?.caption || message.buttonsResponseMessage?.selectedDisplayText || message.listResponseMessage?.title || "";
}
function detectMediaType(message) {
  if (!message) return null;
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.stickerMessage) return "sticker";
  return null;
}
async function resolvePhoneFromLid(remoteJid, instanceName) {
  try {
    const res = await fetch(`${EVOLUTION_URL}/contact/getInfo/${instanceName}?number=${remoteJid}`, {
      headers: {
        "apikey": EVOLUTION_KEY
      }
    });
    const data = await res.json();
    const realJid = data?.jid || data?.id || "";
    if (realJid.includes("@s.whatsapp.net")) {
      return digitsOnly(realJid.split("@")[0]);
    }
  } catch (e) {
    console.warn("[whatsapp-webhook] falha ao resolver @lid:", e);
  }
  return digitsOnly(remoteJid.split("@")[0]);
}
async function downloadAndStoreMedia(messageId, instanceName, mediaType) {
  try {
    const res = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: {
        "apikey": EVOLUTION_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          key: {
            id: messageId
          }
        },
        convertToMp4: false
      })
    });
    const data = await res.json();
    const base64 = data?.base64 || data?.mediaUrl || "";
    if (!base64) return null;
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
    const mimeType = data?.mimetype || (mediaType === "audio" ? "audio/ogg" : "application/octet-stream");
    const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const filePath = `${mediaType}/${messageId}.${ext}`;
    const byteString = atob(base64Data);
    const byteArray = new Uint8Array(byteString.length);
    for(let i = 0; i < byteString.length; i++){
      byteArray[i] = byteString.charCodeAt(i);
    }
    const { error } = await admin.storage.from("whatsapp-media").upload(filePath, byteArray, {
      contentType: mimeType,
      upsert: true
    });
    if (error) {
      console.warn("[whatsapp-webhook] erro ao salvar mídia:", error.message);
      return null;
    }
    const { data: urlData } = admin.storage.from("whatsapp-media").getPublicUrl(filePath);
    return urlData?.publicUrl ?? null;
  } catch (e) {
    console.warn("[whatsapp-webhook] falha ao baixar mídia:", e);
    return null;
  }
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const payload = await req.json().catch(()=>({}));
    const event = String(payload.event ?? "").toLowerCase();
    const instance = String(payload.instance ?? payload.instanceName ?? "");
    let storeId = null;
    if (instance.startsWith("loja-")) {
      storeId = instance.slice(5);
    } else {
      const { data: conn } = await admin.from("whatsapp_connections").select("store_id").eq("evolution_instance_name", instance).maybeSingle();
      storeId = conn?.store_id ?? null;
    }
    if (!storeId) {
      return new Response(JSON.stringify({
        ok: true,
        ignored: "no_store"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (event === "connection.update") {
      const state = payload.data?.state ?? payload.state;
      const mapped = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
      await admin.from("whatsapp_connections").update({
        status: mapped,
        connected_at: mapped === "connected" ? new Date().toISOString() : null
      }).eq("store_id", storeId);

      // Quando conecta com sucesso: reconfigura webhook com Authorization header imediatamente
      if (mapped === "connected" && instance && EVOLUTION_URL && EVOLUTION_KEY && SUPABASE_ANON) {
        try {
          const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
          await fetch(`${EVOLUTION_URL}/webhook/set/${instance}`, {
            method: "POST",
            headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              webhook: {
                url: webhookUrl,
                byEvents: false,
                base64: false,
                enabled: true,
                headers: { Authorization: `Bearer ${SUPABASE_ANON}` },
                events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
              }
            })
          });
          console.log("[whatsapp-webhook] webhook reconfigurado on-connect:", instance);
        } catch (e) {
          console.warn("[whatsapp-webhook] falha ao reconfigurar webhook on-connect:", e);
        }
      }

      // Auto-reconexão removida — causava loop de ban no WhatsApp.
      // A reconexão é responsabilidade do usuário via botão no CRM.
      if (mapped === "disconnected") {
        console.log("[whatsapp-webhook] instância desconectada:", instance, "— aguardando reconexão manual.");
      }

      return new Response(JSON.stringify({
        ok: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (event === "messages.update" || event === "messages.status" || event === "message.ack") {
      // Evolution envia atualizações de ACK aqui (DELIVERY_ACK, READ, etc.)
      const dataArr = Array.isArray(payload.data) ? payload.data : [payload.data];
      for (const upd of dataArr) {
        if (!upd) continue;
        const key = upd.key ?? upd;
        const messageId = key?.id ?? upd.messageId ?? upd.id;
        if (!messageId) continue;

        // Evolution pode mandar status como string ou número (Baileys)
        const rawStatus = upd.status ?? upd.update?.status ?? upd.ack;
        let mapped: string | null = null;
        if (typeof rawStatus === "number") {
          // 0 PENDING, 1 SERVER_ACK, 2 DELIVERY_ACK, 3 READ, 4 PLAYED
          if (rawStatus === 1) mapped = "sent";
          else if (rawStatus === 2) mapped = "delivered";
          else if (rawStatus === 3 || rawStatus === 4) mapped = "read";
          else if (rawStatus === 0) mapped = "sending";
        } else if (typeof rawStatus === "string") {
          const s = rawStatus.toUpperCase();
          if (s === "SERVER_ACK" || s === "SENT") mapped = "sent";
          else if (s === "DELIVERY_ACK" || s === "DELIVERED") mapped = "delivered";
          else if (s === "READ" || s === "PLAYED") mapped = "read";
          else if (s === "PENDING") mapped = "sending";
          else if (s === "ERROR" || s === "FAILED") mapped = "failed";
        }

        if (!mapped) continue;

        const { error: updErr } = await admin
          .from("whatsapp_messages")
          .update({ status: mapped })
          .eq("store_id", storeId)
          .eq("message_id", messageId);
        if (updErr) {
          console.warn("[whatsapp-webhook] update status erro:", updErr.message, messageId, mapped);
        } else {
          console.log("[whatsapp-webhook] status atualizado", messageId, "->", mapped);
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (event === "messages.upsert" || event === "send.message") {

      const dataArr = Array.isArray(payload.data) ? payload.data : [
        payload.data
      ];
      for (const msg of dataArr){
        if (!msg) continue;
        const key = msg.key ?? {};
        const remoteJid = key.remoteJid ?? "";
        const fromMe = Boolean(key.fromMe);
        const messageId = key.id ?? msg.messageId ?? crypto.randomUUID();
        if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") continue;
        let phoneDigits;
        if (remoteJid.endsWith("@lid")) {
          phoneDigits = await resolvePhoneFromLid(remoteJid, instance);
        } else {
          phoneDigits = digitsOnly(remoteJid.split("@")[0]);
        }
        const last10 = phoneDigits.slice(-10);
        const body = extractText(msg.message);
        const mediaType = detectMediaType(msg.message);
        const timestamp = msg.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString();
        let mediaUrl = null;
        if (mediaType) {
          mediaUrl = await downloadAndStoreMedia(messageId, instance, mediaType);
        }
        let leadId = null;
        if (last10) {
          const { data: leadRow } = await admin.rpc("find_lead_by_phone", {
            p_store_id: storeId,
            p_last10: last10
          });
          leadId = leadRow ?? null;
        }
        // Auto-criar lead se não existir e mensagem for recebida
        if (!leadId && last10 && !fromMe) {
          const fullPhone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
          const pushName = msg.pushName || null;
          const { data: newLead } = await admin.from("leads").insert({
            store_id: storeId,
            name: pushName || `+${fullPhone}`,
            phone: fullPhone,
            status: "Novo Lead",
            lead_source: "WhatsApp",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).select("id").single();
          leadId = newLead?.id ?? null;
          console.log("[whatsapp-webhook] lead auto-criado:", leadId, fullPhone, pushName);
        }
        await admin.from("whatsapp_messages").upsert({
          store_id: storeId,
          lead_id: leadId,
          instance_name: instance,
          remote_jid: remoteJid,
          message_id: messageId,
          from_me: fromMe,
          body: body || null,
          media_type: mediaType,
          media_url: mediaUrl,
          timestamp,
          status: fromMe ? "sent" : "received"
        }, {
          onConflict: "message_id"
        });
        if (leadId) {
          const previewText = (body || (mediaType ? `[${mediaType}]` : "")).slice(0, 100);
          if (!fromMe) {
            const { error: rpcErr } = await admin.rpc("increment_lead_unread", {
              _lead_id: leadId,
              _preview: previewText,
              _ts: timestamp
            });

            // Enviar push notification para os dispositivos da loja (best-effort)
            if (storeId) {
              const { data: leadData } = await admin
                .from("leads")
                .select("name")
                .eq("id", leadId)
                .maybeSingle();
              const senderName = leadData?.name ?? "Cliente";
              fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SERVICE_ROLE}`,
                },
                body: JSON.stringify({
                  store_id: storeId,
                  title: senderName,
                  body: previewText || "Nova mensagem",
                  lead_id: leadId,
                }),
              }).catch(() => {}); // Nunca bloqueia o webhook
            }
            if (rpcErr) {
              const { data: leadCur } = await admin.from("leads").select("unread_count").eq("id", leadId).maybeSingle();
              const next = (leadCur?.unread_count ?? 0) + 1;
              await admin.from("leads").update({
                unread_count: next,
                last_message_at: timestamp,
                last_inbound_at: timestamp,
                last_message_preview: previewText,
                updated_at: new Date().toISOString()
              }).eq("id", leadId);
            }
          } else {
            await admin.from("leads").update({
              last_message_at: timestamp,
              last_message_preview: previewText,
              updated_at: new Date().toISOString()
            }).eq("id", leadId);
          }
        }
      }
      return new Response(JSON.stringify({
        ok: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      ignored: event
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({
      error: msg
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
