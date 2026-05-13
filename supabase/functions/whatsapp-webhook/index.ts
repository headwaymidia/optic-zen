// Webhook receiver for Evolution API.
// Handles incoming WhatsApp messages, persists to whatsapp_messages and
// auto-creates a lead when the sender phone is unknown for the store.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function formatPhoneAsName(digits: string): string {
  const d = digits.replace(/\D/g, "");
  // Strip Brazil country code 55 if present for the display name
  const local = d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) {
    return `Contato (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `Contato (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return `Contato ${local || d}`;
}

function pickMediaType(msg: any): { type: string | null; url: string | null; body: string | null } {
  const m = msg?.message ?? msg;
  if (m?.imageMessage) {
    return { type: "image", url: m.imageMessage?.url ?? null, body: m.imageMessage?.caption ?? null };
  }
  if (m?.videoMessage) {
    return { type: "video", url: m.videoMessage?.url ?? null, body: m.videoMessage?.caption ?? null };
  }
  if (m?.audioMessage) {
    return { type: "audio", url: m.audioMessage?.url ?? null, body: null };
  }
  if (m?.documentMessage) {
    return { type: "document", url: m.documentMessage?.url ?? null, body: m.documentMessage?.fileName ?? null };
  }
  return { type: null, url: null, body: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const event: string = payload?.event ?? payload?.type ?? "";
    const instance: string = payload?.instance ?? payload?.instanceName ?? "";
    const data = payload?.data ?? payload;

    // Resolve store_id from the instance name (loja-{store_id})
    let storeId: string | null = null;
    if (instance) {
      const { data: conn } = await admin
        .from("whatsapp_connections")
        .select("store_id")
        .eq("evolution_instance_name", instance)
        .maybeSingle();
      storeId = conn?.store_id ?? null;
    }
    if (!storeId && instance.startsWith("loja-")) {
      storeId = instance.slice(5);
    }

    if (!storeId) {
      return new Response(JSON.stringify({ ok: true, ignored: "no store" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize a list of message events
    const messages: any[] = Array.isArray(data?.messages)
      ? data.messages
      : Array.isArray(data)
      ? data
      : [data];

    // ─── messages.update: atualiza status (delivered / read) ───
    const isStatusUpdate = /messages?\.?update/i.test(event);
    if (isStatusUpdate) {
      const updates: any[] = Array.isArray(data?.updates)
        ? data.updates
        : Array.isArray(data)
        ? data
        : [data];

      let updated = 0;
      for (const u of updates) {
        if (!u) continue;
        const msgId: string =
          u?.key?.id ?? u?.keyId ?? u?.messageId ?? u?.id ?? "";
        const rawStatus: string = String(
          u?.status ?? u?.update?.status ?? u?.message?.status ?? "",
        ).toUpperCase();

        let nextStatus: string | null = null;
        if (rawStatus === "DELIVERY_ACK" || rawStatus === "DELIVERED") {
          nextStatus = "delivered";
        } else if (rawStatus === "READ" || rawStatus === "PLAYED") {
          nextStatus = "read";
        } else if (rawStatus === "SERVER_ACK" || rawStatus === "SENT") {
          nextStatus = "sent";
        }

        if (!msgId || !nextStatus) continue;

        const { error: updErr } = await admin
          .from("whatsapp_messages")
          .update({ status: nextStatus })
          .eq("store_id", storeId)
          .eq("message_id", msgId);
        if (updErr) {
          console.error("[webhook] status update error:", updErr);
        } else {
          updated++;
        }
      }

      return new Response(
        JSON.stringify({ ok: true, status_updated: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isMessageEvent =
      !event ||
      /messages?\.?upsert/i.test(event) ||
      /message/i.test(event);

    if (!isMessageEvent) {
      return new Response(JSON.stringify({ ok: true, ignored: event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const m of messages) {
      if (!m) continue;
      const remoteJid: string =
        m?.key?.remoteJid ?? m?.remoteJid ?? m?.from ?? "";
      if (!remoteJid || remoteJid.endsWith("@g.us")) continue; // ignore groups
      const fromMe: boolean = !!(m?.key?.fromMe ?? m?.fromMe);
      const messageId: string =
        m?.key?.id ?? m?.messageId ?? m?.id ?? crypto.randomUUID();

      const phoneDigits = remoteJid.split("@")[0].replace(/\D/g, "");
      const last10 = phoneDigits.slice(-10);

      const text =
        m?.message?.conversation ??
        m?.message?.extendedTextMessage?.text ??
        m?.body ??
        m?.text ??
        null;
      const media = pickMediaType(m);
      const bodyText = text ?? media.body ?? null;

      // 1) Try to find existing lead by phone in this store
      let leadId: string | null = null;
      if (last10) {
        const { data: leadRow } = await admin
          .from("leads")
          .select("id")
          .eq("store_id", storeId)
          .ilike("phone", `%${last10}%`)
          .limit(1)
          .maybeSingle();
        leadId = leadRow?.id ?? null;
      }

      // 2) If unknown and the message is inbound, auto-create the lead
      if (!leadId && !fromMe) {
        const { data: created, error: leadErr } = await admin
          .from("leads")
          .insert({
            store_id: storeId,
            name: formatPhoneAsName(phoneDigits),
            phone: phoneDigits,
            status: "Novo Lead",
            lead_source: "WhatsApp",
            last_inbound_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (leadErr) {
          console.error("[webhook] auto-create lead error:", leadErr);
        } else {
          leadId = created?.id ?? null;
          // Notifica o dono da loja por e-mail (fire-and-forget)
          if (leadId) {
            admin.functions
              .invoke("notify-new-lead", { body: { lead_id: leadId } })
              .catch((e) => console.error("[webhook] notify-new-lead invoke error:", e));
          }
        }
      }

      // 3) Insert the message
      const preview =
        media.type === "image"
          ? "📷 Imagem"
          : media.type === "video"
          ? "🎬 Vídeo"
          : media.type === "audio"
          ? "🎵 Áudio"
          : media.type === "document"
          ? "📎 Documento"
          : (bodyText ?? "").slice(0, 100);

      const { error: insErr } = await admin.from("whatsapp_messages").insert({
        store_id: storeId,
        lead_id: leadId,
        instance_name: instance || null,
        remote_jid: remoteJid,
        message_id: messageId,
        from_me: fromMe,
        body: bodyText,
        media_type: media.type,
        media_url: media.url,
        timestamp: new Date().toISOString(),
        status: "received",
      });
      if (insErr) console.error("[webhook] insert message error:", insErr);

      // 4) Update lead preview / last_inbound_at
      if (leadId) {
        await admin
          .from("leads")
          .update({
            updated_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
            last_message_preview: preview,
            ...(fromMe ? {} : { last_inbound_at: new Date().toISOString() }),
          })
          .eq("id", leadId);

        if (!fromMe) {
          const { error: incErr } = await admin.rpc("increment_lead_unread", {
            _lead_id: leadId,
          });
          if (incErr) console.error("[webhook] increment_lead_unread error:", incErr);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[whatsapp-webhook]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
