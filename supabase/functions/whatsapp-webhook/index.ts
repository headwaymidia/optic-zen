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

      // Estado ANTERIOR — para so avisar na TRANSICAO (evita spam a cada evento).
      const { data: prevConn } = await admin
        .from("whatsapp_connections")
        .select("status")
        .eq("store_id", storeId)
        .maybeSingle();
      const wasConnected = prevConn?.status === "connected";

      await admin.from("whatsapp_connections").update({
        status: mapped,
        connected_at: mapped === "connected" ? new Date().toISOString() : null
      }).eq("store_id", storeId);

      // AVISO IMEDIATO na queda: antes so avisava depois de 3 tentativas de
      // reconexao (>2min), e o monitor de 5min ignora quem ja esta "disconnected"
      // -> a loja caia e NINGUEM sabia. A vendedora descobria tentando enviar e
      // falhando. Agora avisa (sino + push) assim que cai.
      if (mapped === "disconnected" && wasConnected) {
        try {
          const { data: mbs } = await admin
            .from("store_members")
            .select("user_id")
            .eq("store_id", storeId)
            .in("role", ["Dono", "Gerente"]);
          if (mbs?.length) {
            await admin.from("notifications").insert(
              mbs.map((m: any) => ({
                user_id: m.user_id,
                store_id: storeId,
                type: "whatsapp_disconnected",
                title: "⚠️ WhatsApp desconectado",
                body: "O WhatsApp da loja caiu. As mensagens não serão enviadas nem recebidas até reconectar em Configurações → WhatsApp.",
                read: false,
              }))
            );
          }
          // Push no celular — o dono pode nao estar com o CRM aberto.
          fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}` },
            body: JSON.stringify({
              store_id: storeId,
              title: "⚠️ WhatsApp desconectado",
              body: "O WhatsApp da loja caiu. Reconecte em Configurações → WhatsApp.",
            }),
          }).catch(() => {});
          console.log("[whatsapp-webhook] alerta de desconexao enviado:", storeId);
        } catch (e) {
          console.warn("[whatsapp-webhook] falha ao alertar desconexao:", e);
        }
      }

      // Quando conecta com sucesso: reconfigura webhook com AMBOS os headers.
      // CRITICO: precisa incluir o x-webhook-secret. Sem ele, a instancia passa a
      // rejeitar as PROPRIAS mensagens com 401 (foi a causa de cliente novo conectar
      // e nao receber nada). Antes so gravava Authorization -> quebrava o onboarding.
      if (mapped === "connected" && instance && EVOLUTION_URL && EVOLUTION_KEY && SUPABASE_ANON) {
        try {
          const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
          const onConnHeaders: Record<string, string> = { Authorization: `Bearer ${SUPABASE_ANON}` };
          const wSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";
          if (wSecret) onConnHeaders["x-webhook-secret"] = wSecret;
          const setRes = await fetch(`${EVOLUTION_URL}/webhook/set/${instance}`, {
            method: "POST",
            headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              webhook: {
                url: webhookUrl,
                byEvents: false,
                base64: false,
                enabled: true,
                headers: onConnHeaders,
                events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "MESSAGES_SET"],
              }
            })
          });
          // VERIFICACAO POS-CONEXAO: confirma que o webhook "pegou" na Evolution.
          // Se nao pegou (status ruim), tenta mais uma vez — evita instancia zumbi
          // que conecta mas nao recebe (o caso que exigia reconexao manual).
          if (setRes.status >= 400) {
            console.warn("[whatsapp-webhook] webhook on-connect falhou, tentando de novo:", instance, setRes.status);
            await fetch(`${EVOLUTION_URL}/webhook/set/${instance}`, {
              method: "POST",
              headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({
                webhook: { url: webhookUrl, byEvents: false, base64: false, enabled: true, headers: onConnHeaders, events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "MESSAGES_SET"] }
              })
            }).catch(() => {});
          } else {
            console.log("[whatsapp-webhook] webhook reconfigurado on-connect (com secret):", instance);
          }
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
    // HISTORICO (messages.set): quando a instancia re-pareia (QR), o WhatsApp envia
    // as conversas do periodo em que a sessao esteve caida (ex.: fim de semana
    // respondido pelo celular). Antes este evento era IGNORADO — o historico chegava
    // na Evolution e morria ali; o CRM mostrava a conversa "vazia" na segunda.
    // Importacao SILENCIOSA: grava mensagens e cria leads, mas SEM push, SEM badge
    // e SEM download de midia (sao mensagens antigas; corpo/tipo bastam).
    if (event === "messages.set") {
      const raw = payload.data;
      const items = Array.isArray(raw) ? raw : Array.isArray(raw?.messages) ? raw.messages : [];
      const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000; // janela: ultimos 30 dias
      const MAX = 800; // protecao contra timeout da edge function
      let imported = 0, skipped = 0;
      const latestByLead = new Map();
      for (const msg of items.slice(0, MAX)) {
        try {
          const key = msg?.key ?? {};
          const remoteJid = key.remoteJid ?? "";
          // grupos, broadcast e @lid (resolver lid = 1 chamada de API por msg; caro p/ lote)
          if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast" || remoteJid.endsWith("@lid")) { skipped++; continue; }
          const messageId = key.id ?? null;
          if (!messageId) { skipped++; continue; }
          const tsMs = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : NaN;
          if (!Number.isFinite(tsMs) || tsMs < cutoffMs) { skipped++; continue; }
          const fromMe = Boolean(key.fromMe);
          const timestamp = new Date(tsMs).toISOString();
          const phoneDigits = digitsOnly(remoteJid.split("@")[0]);
          const last10 = phoneDigits.slice(-10);
          if (!last10) { skipped++; continue; }
          const body = extractText(msg.message);
          const mediaType = detectMediaType(msg.message);
          if (!body && !mediaType) { skipped++; continue; }

          let leadId = null;
          const { data: leadRow } = await admin.rpc("find_lead_by_phone", { p_store_id: storeId, p_last10: last10 });
          leadId = leadRow ?? null;
          if (!leadId) {
            const fullPhone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
            const pushName = msg.pushName || null;
            const { data: newLead } = await admin.from("leads").upsert({
              store_id: storeId,
              name: (!fromMe && pushName) ? pushName : `+${fullPhone}`,
              phone: fullPhone,
              status: fromMe ? "Em Atendimento" : "Novo Lead",
              lead_source: "WhatsApp",
              created_at: timestamp,
              updated_at: new Date().toISOString(),
            }, { onConflict: "store_id,phone", ignoreDuplicates: false }).select("id").maybeSingle();
            leadId = newLead?.id ?? null;
          }
          if (!leadId) { skipped++; continue; }

          await admin.from("whatsapp_messages").upsert({
            store_id: storeId,
            lead_id: leadId,
            instance_name: instance,
            remote_jid: remoteJid,
            message_id: messageId,
            from_me: fromMe,
            body: body || null,
            media_type: mediaType,
            media_url: null,
            timestamp,
            status: fromMe ? "sent" : "received"
          }, { onConflict: "message_id", ignoreDuplicates: true });
          imported++;

          const prev = latestByLead.get(leadId);
          if (!prev || prev.ts < timestamp) {
            latestByLead.set(leadId, { ts: timestamp, preview: (body || (mediaType ? `[${mediaType}]` : "")).slice(0, 100) });
          }
        } catch (_e) { skipped++; }
      }
      // Atualiza a ordenacao da lista de conversas — so se o historico e mais novo
      // que o que o lead ja tem (nunca "volta" uma conversa no tempo).
      for (const [lid, info] of latestByLead) {
        try {
          const { data: cur } = await admin.from("leads").select("last_message_at").eq("id", lid).maybeSingle();
          if (!cur?.last_message_at || new Date(cur.last_message_at).getTime() < new Date(info.ts).getTime()) {
            await admin.from("leads").update({ last_message_at: info.ts, last_message_preview: info.preview, updated_at: new Date().toISOString() }).eq("id", lid);
          }
        } catch (_e) { /* segue */ }
      }
      console.log(`[whatsapp-webhook] historico importado (${instance}): ${imported} msgs, ${skipped} ignoradas, ${latestByLead.size} leads`);
      return new Response(JSON.stringify({ ok: true, imported, skipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
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
          // Tenta usar base64 direto do payload (mais rápido e confiável)
          const inlineBase64 = msg.message?.imageMessage?.jpegThumbnail
            || msg.message?.imageMessage?.base64
            || msg.message?.videoMessage?.base64
            || msg.message?.audioMessage?.base64
            || msg.message?.documentMessage?.base64
            || null;

          if (inlineBase64) {
            // Salva direto sem precisar chamar a Evolution novamente
            try {
              const mimeType = msg.message?.imageMessage?.mimetype
                || msg.message?.videoMessage?.mimetype
                || msg.message?.audioMessage?.mimetype
                || msg.message?.documentMessage?.mimetype
                || (mediaType === "audio" ? "audio/ogg" : "image/jpeg");
              const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
              const filePath = `${mediaType}/${messageId}.${ext}`;
              const base64Data = inlineBase64.includes(",") ? inlineBase64.split(",")[1] : inlineBase64;
              const byteString = atob(base64Data);
              const byteArray = new Uint8Array(byteString.length);
              for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
              const { error: upErr } = await admin.storage.from("whatsapp-media").upload(filePath, byteArray, { contentType: mimeType, upsert: true });
              if (!upErr) {
                const { data: urlData } = admin.storage.from("whatsapp-media").getPublicUrl(filePath);
                mediaUrl = urlData?.publicUrl ?? null;
              }
            } catch {}
          }

          // Fallback: buscar base64 via API da Evolution
          if (!mediaUrl) {
            mediaUrl = await downloadAndStoreMedia(messageId, instance, mediaType);
          }
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

        // Auto-criar lead se não existir — para mensagem recebida OU enviada
        if (!leadId && last10) {
          const fullPhone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
          const pushName = msg.pushName || null;
          const initialStatus = fromMe ? "Em Atendimento" : "Novo Lead";
          const { data: newLead } = await admin.from("leads").upsert({
            store_id: storeId,
            name: (!fromMe && pushName) ? pushName : `+${fullPhone}`,
            phone: fullPhone,
            status: initialStatus,
            lead_source: ctwaClid ? "Anúncio WhatsApp" : "WhatsApp",
            ctwa_clid: ctwaClid,
            ad_source: adSource,
            ad_creative_name: adCreativeName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: "store_id,phone", ignoreDuplicates: false }).select("id").maybeSingle();
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
        // Content-based deduplication: syncFullHistory pode reimportar mensagens antigas com novos message_ids
        let isDuplicate = false;
        if (leadId && (body || mediaUrl)) {
          const tsMs = new Date(timestamp).getTime();
          const tsBefore = new Date(tsMs - 1000).toISOString();
          const tsAfter = new Date(tsMs + 1000).toISOString();
          let dupQuery = admin
            .from("whatsapp_messages")
            .select("message_id")
            .eq("lead_id", leadId)
            .eq("from_me", fromMe)
            .neq("message_id", messageId)
            .gte("timestamp", tsBefore)
            .lte("timestamp", tsAfter);
          if (body) {
            dupQuery = dupQuery.eq("body", body);
          } else if (mediaUrl) {
            dupQuery = dupQuery.eq("media_url", mediaUrl);
          }
          const { data: dupRows } = await dupQuery.limit(1);
          if (dupRows && dupRows.length > 0) {
            isDuplicate = true;
            console.log("[whatsapp-webhook] duplicata detectada, ignorando:", messageId);
          }
        }

        if (!isDuplicate) {
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
        }
        if (leadId && !isDuplicate) {
          const previewText = (body || (mediaType ? `[${mediaType}]` : "")).slice(0, 100);
          if (!fromMe) {
            // Recupera nome real: se o lead esta com placeholder (numero/vazio) e
            // chegou pushName numa mensagem RECEBIDA, atualiza o nome.
            const pushName2 = msg.pushName?.trim() || null;
            if (pushName2) {
              const { data: curName } = await admin
                .from("leads").select("name").eq("id", leadId).maybeSingle();
              const atual = curName?.name ?? "";
              const ehPlaceholder = !atual || /^\+?55\d{8,}$/.test(atual.replace(/\D/g, "")) || atual.startsWith("+");
              if (ehPlaceholder && atual !== pushName2) {
                await admin.from("leads").update({ name: pushName2 }).eq("id", leadId);
              }
            }
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
              console.warn("[whatsapp-webhook] increment_lead_unread falhou, update direto:", rpcErr?.code);
              const { data: cur } = await admin
                .from("leads").select("unread_count").eq("id", leadId).maybeSingle();
              await admin.from("leads").update({
                last_message_at: timestamp,
                last_message_preview: previewText,
                unread_count: (cur?.unread_count ?? 0) + 1,
                updated_at: new Date().toISOString(),
              }).eq("id", leadId);
            }
          } else {
            const { data: currentLead } = await admin
              .from("leads").select("status").eq("id", leadId).maybeSingle();
            const updateData = {
              last_message_at: timestamp,
              last_message_preview: `Você: ${previewText}`,
              unread_count: 0,
              updated_at: new Date().toISOString(),
            };
            if (currentLead?.status === "Novo Lead") {
              updateData.status = "Em Atendimento";
            }
            await admin.from("leads").update(updateData).eq("id", leadId);
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
