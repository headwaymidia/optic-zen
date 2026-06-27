// send-push-notification — envia Web Push para todos os dispositivos
// inscritos de uma loja quando chega uma mensagem nova.
// Usa npm:web-push para fazer a criptografia ECDH+HKDF+AES128GCM
// exigida pelo RFC 8291 (NÃO implementar isso manualmente).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_PUBLIC_KEY =
  Deno.env.get("VAPID_PUBLIC_KEY") ??
  "BM5V_XFoV7RwQjtQFSKPUT6n6wrgCv_ulJhWa5rW7kuqVSzehPYYPc5VAVjX0Aw8F0dl1EnxQkQyKAsqZQGekrE";
const VAPID_SUBJECT = "mailto:felipe@headwaymidia.com.br";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

if (VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.error("[send-push] setVapidDetails falhou:", e);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPID_PRIVATE_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { store_id, title, body, lead_id } = await req.json();

    if (!store_id || !title) {
      return new Response(
        JSON.stringify({ error: "store_id e title são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("store_id", store_id);

    if (error) {
      console.error("[send-push] erro ao listar subs:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!subs?.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      tag: `lead-${lead_id}`,
      data: { lead_id },
    });

    let sent = 0;
    const expired: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            { TTL: 86400 },
          );
          sent++;
        } catch (e: any) {
          const status = e?.statusCode;
          if (status === 404 || status === 410) {
            expired.push(sub.endpoint);
          } else {
            console.warn("[send-push] erro:", status, e?.body ?? e?.message ?? e);
          }
        }
      }),
    );

    if (expired.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", expired);
    }

    return new Response(
      JSON.stringify({ ok: true, sent, cleaned: expired.length, total: subs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[send-push-notification]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
