import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const META_VERIFY_TOKEN = "oticadominante_meta_webhook_2024";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
function digitsOnly(s) {
  return (s ?? "").replace(/\D/g, "");
}
async function downloadMetaMedia(mediaId, accessToken) {
  try {
    const urlRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    const { url } = await urlRes.json();
    if (!url) return null;
    const mediaRes = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    const buffer = await mediaRes.arrayBuffer();
    const mimeType = mediaRes.headers.get("content-type") || "application/octet-stream";
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return {
      base64,
      mimeType
    };
  } catch (e) {
    console.warn("Erro ao baixar mídia Meta:", e);
    return null;
  }
}
async function saveMedia(base64, mimeType, messageId, mediaType) {
  try {
    const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const filePath = `${mediaType}/${messageId}.${ext}`;
    const byteString = atob(base64);
    const byteArray = new Uint8Array(byteString.length);
    for(let i = 0; i < byteString.length; i++)byteArray[i] = byteString.charCodeAt(i);
    const { error } = await admin.storage.from("whatsapp-media").upload(filePath, byteArray, {
      contentType: mimeType,
      upsert: true
    });
    if (error) return null;
    const { data } = admin.storage.from("whatsapp-media").getPublicUrl(filePath);
    return data?.publicUrl ?? null;
  } catch (e) {
    return null;
  }
}
Deno.serve(async (req)=>{
  // Verificação do webhook (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
      return new Response(challenge, {
        status: 200
      });
    }
    return new Response("Forbidden", {
      status: 403
    });
  }
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const payload = await req.json().catch(()=>({}));
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    if (!value) {
      return new Response(JSON.stringify({
        ok: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const phoneNumberId = value.metadata?.phone_number_id;
    if (!phoneNumberId) {
      return new Response(JSON.stringify({
        ok: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Busca a conexão pelo phone_number_id
    const { data: conn } = await admin.from("whatsapp_connections").select("store_id, meta_access_token").eq("meta_phone_number_id", phoneNumberId).maybeSingle();
    if (!conn?.store_id) {
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
    const storeId = conn.store_id;
    const accessToken = conn.meta_access_token;
    // Processa mensagens
    const messages = value.messages || [];
    for (const msg of messages){
      const fromPhone = digitsOnly(msg.from);
      const messageId = msg.id;
      const timestamp = new Date(Number(msg.timestamp) * 1000).toISOString();
      const last10 = fromPhone.slice(-10);
      let body = "";
      let mediaType = null;
      let mediaUrl = null;
      if (msg.type === "text") {
        body = msg.text?.body || "";
      } else if ([
        "image",
        "video",
        "audio",
        "document"
      ].includes(msg.type)) {
        mediaType = msg.type;
        const mediaId = msg[msg.type]?.id;
        if (mediaId && accessToken) {
          const media = await downloadMetaMedia(mediaId, accessToken);
          if (media) {
            mediaUrl = await saveMedia(media.base64, media.mimeType, messageId, mediaType);
          }
        }
        body = msg[msg.type]?.caption || "";
      }
      // Busca ou cria lead
      let leadId = null;
      if (last10) {
        const { data: leadRow } = await admin.rpc("find_lead_by_phone", {
          p_store_id: storeId,
          p_last10: last10
        });
        leadId = leadRow ?? null;
      }
      if (!leadId && last10) {
        const fullPhone = fromPhone.startsWith("55") ? fromPhone : `55${fromPhone}`;
        const pushName = value.contacts?.[0]?.profile?.name || null;
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
      }
      await admin.from("whatsapp_messages").upsert({
        store_id: storeId,
        lead_id: leadId,
        instance_name: `meta-${phoneNumberId}`,
        remote_jid: `${fromPhone}@s.whatsapp.net`,
        message_id: messageId,
        from_me: false,
        body: body || null,
        media_type: mediaType,
        media_url: mediaUrl,
        timestamp,
        status: "received"
      }, {
        onConflict: "message_id"
      });
      if (leadId) {
        const previewText = (body || (mediaType ? `[${mediaType}]` : "")).slice(0, 100);
        await admin.rpc("increment_lead_unread", {
          _lead_id: leadId,
          _preview: previewText,
          _ts: timestamp
        });
      }
    }
    // Processa status de entrega/leitura
    const statuses = value.statuses || [];
    for (const status of statuses){
      const mapped = status.status === "delivered" ? "delivered" : status.status === "read" ? "read" : status.status === "sent" ? "sent" : null;
      if (mapped) {
        await admin.from("whatsapp_messages").update({
          status: mapped
        }).eq("message_id", status.id);
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
