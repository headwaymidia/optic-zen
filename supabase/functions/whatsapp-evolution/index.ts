// Evolution API proxy for multi-tenant WhatsApp QR Code integration.
// Each loja has its own isolated instance named loja-{store_id}.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function instanceNameFor(storeId: string) {
  return `loja-${storeId}`;
}

async function evo(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: any }> {
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
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

function mapState(state?: string): "connected" | "connecting" | "disconnected" {
  if (state === "open") return "connected";
  if (state === "connecting") return "connecting";
  return "disconnected";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!EVO_URL || !EVO_KEY) {
      throw new Error("Evolution API não configurada (URL/KEY ausentes).");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const storeId = String(body.store_id ?? "");

    if (!storeId) throw new Error("store_id é obrigatório");

    // Verifica permissão (Dono/Gerente)
    const { data: roleRow } = await admin
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .maybeSingle();

    const role = roleRow?.role;
    const isAdmin = role === "Dono" || role === "Gerente";
    const isMember = !!role;
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Sem acesso à loja" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instance = instanceNameFor(storeId);

    async function upsertConn(patch: Record<string, unknown>) {
      const payload = {
        store_id: storeId,
        provider: "evolution",
        evolution_instance_name: instance,
        ...patch,
      };
      const { data, error } = await admin
        .from("whatsapp_connections")
        .upsert(payload, { onConflict: "store_id" })
        .select()
        .maybeSingle();
      if (error) {
        console.error("[upsertConn] FAILED", {
          store_id: storeId,
          payload,
          error_message: error.message,
          error_details: (error as any).details,
          error_hint: (error as any).hint,
          error_code: (error as any).code,
          error_full: error,
        });
      } else {
        console.log("[upsertConn] ok", { store_id: storeId, status: (data as any)?.status });
      }
      return { data, error };
    }

    if (action === "status") {
      const { status, data } = await evo(
        `/instance/connectionState/${instance}`,
      );
      if (status === 404) {
        await upsertConn({ status: "disconnected", phone_number: null });
        return new Response(
          JSON.stringify({ status: "disconnected", exists: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const state = data?.instance?.state ?? data?.state;
      const mapped = mapState(state);

      let phone: string | null = null;
      if (mapped === "connected") {
        const { data: info } = await evo(
          `/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`,
        );
        const arr = Array.isArray(info) ? info : [info];
        const inst = arr?.[0]?.instance ?? arr?.[0];
        phone = inst?.owner?.split?.("@")?.[0] ?? inst?.number ?? inst?.wuid?.split?.("@")?.[0] ?? null;
      }

      await upsertConn({
        status: mapped,
        phone_number: phone,
        connected_at: mapped === "connected" ? new Date().toISOString() : null,
      });

      return new Response(
        JSON.stringify({ status: mapped, exists: true, phone_number: phone }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "connect") {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Apenas Dono/Gerente pode conectar" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 0) Garante linha em whatsapp_connections ANTES de qualquer outra operação
      const pre = await upsertConn({ status: "connecting" });
      if (pre.error) {
        return new Response(
          JSON.stringify({
            error: "Falha ao registrar conexão no banco",
            details: pre.error.message,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 1) Cria instância na Evolution
      const integrationCandidates: (string | null)[] = [
        null,
        "WHATSAPP-BAILEYS",
        "WHATSAPP-BUSINESS",
      ];

      let create: { status: number; data: any } | null = null;
      for (const integ of integrationCandidates) {
        const payload: Record<string, unknown> = {
          instanceName: instance,
          qrcode: true,
        };
        if (integ) payload.integration = integ;
        create = await evo(`/instance/create`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (create.status < 400 || create.status === 403 || create.status === 409) break;
        const msg = JSON.stringify(create.data ?? "");
        if (!/integration/i.test(msg)) break;
      }

      // 2) ✅ Configura webhook automaticamente para esta instância
      const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
      const webhookResult = await evo(`/webhook/set/${instance}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: false,
            enabled: true,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
          }
        }),
      });
      if (webhookResult.status >= 400) {
        console.error("[connect] webhook config error:", webhookResult.data);
      }

      // 3) Pega QR code
      let qrBase64: string | null =
        create?.data?.qrcode?.base64 ?? create?.data?.qrcode ?? null;

      if (!qrBase64 || (create && create.status >= 400)) {
        const conn = await evo(`/instance/connect/${instance}`);
        qrBase64 =
          conn.data?.base64 ??
          conn.data?.qrcode?.base64 ??
          conn.data?.code ??
          null;
      }

      // 4) Salva conexão no banco
      await upsertConn({ status: "connecting" });

      return new Response(
        JSON.stringify({ qrcode: qrBase64, status: "connecting" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "qr") {
      const conn = await evo(`/instance/connect/${instance}`);
      const qrBase64 =
        conn.data?.base64 ??
        conn.data?.qrcode?.base64 ??
        conn.data?.code ??
        null;
      return new Response(
        JSON.stringify({ qrcode: qrBase64 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "disconnect") {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Apenas Dono/Gerente pode desconectar" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      await evo(`/instance/logout/${instance}`, { method: "DELETE" });
      await upsertConn({ status: "disconnected", phone_number: null, connected_at: null });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Apenas Dono/Gerente" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      await evo(`/instance/logout/${instance}`, { method: "DELETE" }).catch(() => {});
      await evo(`/instance/delete/${instance}`, { method: "DELETE" }).catch(() => {});
      await upsertConn({ status: "disconnected", phone_number: null, connected_at: null });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sendMessage") {
      const phone = String(body.phone ?? "");
      const message = String(body.message ?? "");
      const audioMessage = body.audioMessage as
        | { base64?: string; mimetype?: string }
        | undefined;
      const inMediaBase64 = body.mediaBase64 ? String(body.mediaBase64) : "";
      const storedMediaUrl = body.storedMediaUrl ? String(body.storedMediaUrl) : "";
      const inMediaType = body.mediaType ? String(body.mediaType) : "";
      const caption = body.caption ? String(body.caption) : "";
      const isAudio = !!audioMessage?.base64;
      const isMedia = !!inMediaBase64 && (inMediaType === "image" || inMediaType === "video");

      if (!phone) throw new Error("phone é obrigatório");
      if (!isAudio && !isMedia && !message.trim()) throw new Error("message é obrigatório");

      let phoneDigits = phone.replace(/\D/g, "");
      if (!phoneDigits.startsWith("55")) phoneDigits = `55${phoneDigits}`;
      const remoteJid = `${phoneDigits}@s.whatsapp.net`;

      let send: { status: number; data: any };
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (isMedia) {
        const mimetype = body.mimetype
          ? String(body.mimetype)
          : inMediaType === "image"
          ? "image/jpeg"
          : "video/mp4";
        const fileName = body.fileName ? String(body.fileName) : undefined;

        // Envia o base64 puro diretamente para a Evolution (evita problemas de 403 ao
        // baixar de URLs do Storage).
        send = await evo(`/message/sendMedia/${instance}`, {
          method: "POST",
          body: JSON.stringify({
            number: phoneDigits,
            mediatype: inMediaType,
            media: inMediaBase64,
            mimetype,
            ...(fileName ? { fileName } : {}),
            caption: caption || "",
          }),
        });
        if (send.status < 400) {
          mediaType = inMediaType;
          // Persiste a URL do Storage (já enviada pelo frontend) para exibição no histórico.
          mediaUrl = storedMediaUrl || null;
        }
      } else if (isAudio) {
        send = await evo(`/message/sendWhatsAppAudio/${instance}`, {
          method: "POST",
          body: JSON.stringify({
            number: phoneDigits,
            audio: audioMessage!.base64,
          }),
        });

        if (send.status < 400) {
          try {
            const bin = Uint8Array.from(atob(audioMessage!.base64!), (c) =>
              c.charCodeAt(0),
            );
            const ext =
              (audioMessage!.mimetype ?? "").includes("ogg") ? "ogg" : "webm";
            const path = `${storeId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
            const { error: upErr } = await admin.storage
              .from("whatsapp-media")
              .upload(path, bin, {
                contentType: audioMessage!.mimetype ?? "audio/ogg",
                upsert: false,
              });
            if (upErr) {
              console.error("[sendMessage] storage upload error:", upErr);
            } else {
              const { data: signed } = await admin.storage
                .from("whatsapp-media")
                .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
              mediaUrl = signed?.signedUrl ?? null;
              mediaType = "audio";
            }
          } catch (e) {
            console.error("[sendMessage] storage exception:", e);
          }
        }
      } else {
        send = await evo(`/message/sendText/${instance}`, {
          method: "POST",
          body: JSON.stringify({ number: phoneDigits, text: message }),
        });
      }

      if (send.status >= 400) {
        const errMsg =
          send.data?.message ||
          send.data?.error ||
          JSON.stringify(send.data ?? {});
        return new Response(
          JSON.stringify({ error: `Falha ao enviar: ${errMsg}` }),
          { status: send.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let leadId: string | null = body.lead_id ?? null;
      if (!leadId) {
        const last10 = phoneDigits.slice(-10);
        const { data: leadRow } = await admin
          .from("leads")
          .select("id, phone")
          .eq("store_id", storeId)
          .ilike("phone", `%${last10}%`)
          .limit(1)
          .maybeSingle();
        leadId = leadRow?.id ?? null;
      }

      const messageId =
        send.data?.key?.id ||
        send.data?.messageId ||
        send.data?.id ||
        crypto.randomUUID();

      const bodyText = isMedia ? (caption || null) : isAudio ? null : message;
      const preview = isMedia
        ? (inMediaType === "image" ? "📷 Imagem" : "🎬 Vídeo")
        : isAudio
        ? "🎵 Áudio"
        : message.slice(0, 100);
      const messageTimestamp = new Date().toISOString();

      const { error: insErr } = await admin.from("whatsapp_messages").insert({
        store_id: storeId,
        lead_id: leadId,
        instance_name: instance,
        remote_jid: remoteJid,
        message_id: messageId,
        from_me: true,
        body: bodyText,
        media_type: mediaType,
        media_url: mediaUrl,
        timestamp: messageTimestamp,
        status: "sent",
      });
      if (insErr) console.error("[sendMessage] insert error:", insErr);

      if (leadId) {
        const { error: leadUpdateErr } = await admin
          .from("leads")
          .update({
            updated_at: messageTimestamp,
            last_message_at: messageTimestamp,
            last_message_preview: preview,
          })
          .eq("id", leadId);
        if (leadUpdateErr) console.error("[sendMessage] update lead last_message_at error:", leadUpdateErr);
      }

      return new Response(
        JSON.stringify({ ok: true, message_id: messageId, lead_id: leadId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[whatsapp-evolution]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
