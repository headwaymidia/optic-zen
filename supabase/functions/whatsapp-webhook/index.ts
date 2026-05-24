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
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

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
  // Validação de origem — rejeita requisições sem o token correto
  if (WEBHOOK_SECRET) {
    const incomingSecret =
      req.headers.get("x-webhook-secret") ??
      req.headers.get("x-evolution-secret") ??
      "";
    if (incomingSecret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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

      // Auto-reconexão com exponential backoff
      // device_removed = WhatsApp bloqueou ou usuário desconectou → reconexão manual
      // Queda técnica → tenta até 3x com delays crescentes (10s, 30s, 120s)
      if (mapped === "disconnected" && instance && EVOLUTION_URL && EVOLUTION_KEY) {
        const isDeviceRemoved = JSON.stringify(payload).includes("device_removed");
        if (isDeviceRemoved) {
          console.log("[whatsapp-webhook] device_removed — reconexão manual necessária:", instance);
        } else {
          // Buscar contagem de tentativas recentes no banco (última hora)
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { count: recentAttempts } = await admin
            .from("logs")
            .select("id", { count: "exact", head: true })
            .eq("message", `auto-reconnect:${instance}`)
            .gte("created_at", oneHourAgo);

          const attempts = recentAttempts ?? 0;

          if (attempts >= 3) {
            // Esgotou tentativas — notificar para reconexão manual
            console.warn("[whatsapp-webhook] 3 tentativas falharam — notificando:", instance);
            // Buscar store_id da instância
            const { data: conn } = await admin
              .from("whatsapp_connections")
              .select("store_id")
              .eq("evolution_instance_name", instance)
              .maybeSingle();
            if (conn?.store_id) {
              const { data: members } = await admin
                .from("store_members")
                .select("user_id")
                .eq("store_id", conn.store_id)
                .in("role", ["Dono", "Gerente"]);
              if (members?.length) {
                await admin.from("notifications").insert(
                  members.map((m: any) => ({
                    user_id: m.user_id,
                    store_id: conn.store_id,
                    type: "whatsapp_disconnected",
                    title: "⚠️ WhatsApp precisa de reconexão manual",
                    body: "O WhatsApp tentou reconectar 3 vezes sem sucesso. Acesse Configurações → WhatsApp para reconectar.",
                    read: false,
                  }))
                );
              }
            }
          } else {
            // Exponential backoff: 10s, 30s, 120s
            const delays = [10000, 30000, 120000];
            const delay = delays[attempts] ?? 120000;

            console.log(`[whatsapp-webhook] auto-reconnect tentativa ${attempts + 1}/3 em ${delay/1000}s:`, instance);

            // Registrar tentativa
            await admin.from("logs").insert({
              store_id: null,
              level: "info",
              message: `auto-reconnect:${instance}`,
            });

            await new Promise(r => setTimeout(r, delay));
            try {
              await fetchWithTimeout(`${EVOLUTION_URL}/instance/connect/${instance}`, {
                method: "GET",
                headers: { "apikey": EVOLUTION_KEY }
              }, 15000);
              console.log("[whatsapp-webhook] auto-reconnect disparado:", instance);
            } catch (e) {
              console.warn("[whatsapp-webhook] falha auto-reconnect:", e);
            }
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
        // Detectar ctwaClid — identifica leads vindos de anúncios Click-to-WhatsApp
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo
          || msg.message?.imageMessage?.contextInfo
          || msg.message?.videoMessage?.contextInfo
          || msg.message?.documentMessage?.contextInfo
          || null;
        const ctwaClid = contextInfo?.externalAdReply?.ctwaClid ?? null;
        const adSource = contextInfo?.externalAdReply?.mediaType === 1 ? "instagram"
          : contextInfo?.externalAdReply?.mediaType === 2 ? "facebook"
          : ctwaClid ? "meta" : null;
        const adCreativeName = contextInfo?.externalAdReply?.title ?? null;

        if (ctwaClid) {
          console.log("[whatsapp-webhook] lead via anúncio detectado:", ctwaClid, adSource, adCreativeName);
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
            lead_source: ctwaClid ? "Anúncio WhatsApp" : "WhatsApp",
            ctwa_clid: ctwaClid,
            ad_source: adSource,
            ad_creative_name: adCreativeName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).select("id").single();
          leadId = newLead?.id ?? null;
          console.log("[whatsapp-webhook] lead auto-criado:", leadId, fullPhone, pushName, ctwaClid ? "(via anúncio)" : "");

          // Disparar evento Lead no pixel do Meta se veio de anúncio
          if (ctwaClid && newLead?.id) {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/meta-conversions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                store_id: storeId,
                event_name: "Lead",
                lead_phone: phoneDigits,
                lead_name: pushName,
                ctwa_clid: ctwaClid,
                event_id: `lead-${newLead.id}`,
              }),
            }).catch(e => console.warn("[whatsapp-webhook] meta pixel error:", e));
          }
        } else if (leadId && ctwaClid) {
          // Lead existente — atualizar com ctwaClid se ainda não tiver
          await admin.from("leads").update({
            ctwa_clid: ctwaClid,
            ad_source: adSource,
            ad_creative_name: adCreativeName,
          }).eq("id", leadId).is("ctwa_clid", null);
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
              // Fallback apenas se o RPC falhar por razão inesperada
              console.warn("[whatsapp-webhook] increment_lead_unread falhou, usando fallback:", rpcErr);
              await admin.rpc("increment_lead_unread", { _lead_id: leadId, _preview: previewText, _ts: timestamp });
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
