import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
function digitsOnly(s) {
  return (s ?? "").replace(/\D/g, "");
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const { store_id, lead_id, phone, message, mediaUrl, mediaType, caption, audioMessage, mimetype } = body;
    if (!store_id || !phone) throw new Error("store_id e phone são obrigatórios");
    // Busca credenciais Meta da loja
    const { data: conn } = await admin.from("whatsapp_connections").select("meta_phone_number_id, meta_access_token, provider").eq("store_id", store_id).maybeSingle();
    if (!conn || conn.provider !== "meta") {
      throw new Error("Loja não está usando Meta Cloud API");
    }
    const { meta_phone_number_id, meta_access_token } = conn;
    const digits = digitsOnly(phone);
    const fullPhone = digits.startsWith("55") ? digits : `55${digits}`;
    let msgPayload;
    if (audioMessage) {
      // Envia áudio
      const cleanBase64 = typeof audioMessage === "string" && audioMessage.includes(",") ? audioMessage.split(",")[1] : audioMessage;
      // Upload do áudio pro storage
      const audioBytes = Uint8Array.from(atob(cleanBase64), (c)=>c.charCodeAt(0));
      const fileName = `audio/${store_id}-${Date.now()}.ogg`;
      await admin.storage.from("whatsapp-media").upload(fileName, audioBytes, {
        contentType: "audio/ogg",
        upsert: true
      });
      const { data: urlData } = admin.storage.from("whatsapp-media").getPublicUrl(fileName);
      const audioUrl = urlData?.publicUrl;
      msgPayload = {
        messaging_product: "whatsapp",
        to: fullPhone,
        type: "audio",
        audio: {
          link: audioUrl
        }
      };
    } else if (mediaUrl && mediaType) {
      // Envia imagem ou vídeo
      msgPayload = {
        messaging_product: "whatsapp",
        to: fullPhone,
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: caption || ""
        }
      };
    } else {
      // Envia texto
      msgPayload = {
        messaging_product: "whatsapp",
        to: fullPhone,
        type: "text",
        text: {
          body: message
        }
      };
    }
    const sendRes = await fetch(`https://graph.facebook.com/v19.0/${meta_phone_number_id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${meta_access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(msgPayload)
    });
    const sendData = await sendRes.json();
    if (!sendRes.ok) throw new Error(`Meta API ${sendRes.status}: ${JSON.stringify(sendData)}`);
    const messageId = sendData?.messages?.[0]?.id || crypto.randomUUID();
    const isAudio = !!audioMessage;
    const isMedia = !!(mediaUrl && mediaType);
    const previewText = isAudio ? "[áudio]" : isMedia ? `[${mediaType}]` : (message || "").slice(0, 100);
    await admin.from("whatsapp_messages").insert({
      store_id,
      lead_id: lead_id || null,
      instance_name: `meta-${meta_phone_number_id}`,
      remote_jid: `${fullPhone}@s.whatsapp.net`,
      message_id: messageId,
      from_me: true,
      body: isAudio || isMedia ? null : message,
      media_type: isAudio ? "audio" : isMedia ? mediaType : null,
      media_url: mediaUrl || null,
      timestamp: new Date().toISOString(),
      status: "sent"
    });
    if (lead_id) {
      await admin.from("leads").update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        last_message_preview: previewText
      }).eq("id", lead_id);
    }
    return new Response(JSON.stringify({
      ok: true,
      message_id: messageId
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("whatsapp-meta-send error:", e);
    return new Response(JSON.stringify({
      error: e.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
