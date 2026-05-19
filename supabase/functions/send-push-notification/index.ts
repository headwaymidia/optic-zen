// send-push-notification — envia Web Push para todos os dispositivos
// inscritos de uma loja quando chega uma mensagem nova.
// Chamada pelo whatsapp-webhook após inserir a mensagem.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// VAPID keys — devem ser as mesmas do frontend
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ??
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_SUBJECT = "mailto:felipe@headwaymidia.com.br";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function signVapid(audience: string): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const token = `${encode(header)}.${encode(payload)}`;

  // Import VAPID private key (base64url encoded)
  const keyBytes = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0)
  );
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(token)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${token}.${sigB64}`;
}

Deno.serve(async (req) => {
  try {
    const { store_id, title, body, lead_id } = await req.json();

    if (!store_id || !title) {
      return new Response(JSON.stringify({ error: "store_id e title são obrigatórios" }), {
        status: 400,
      });
    }

    // Buscar todas as subscrições da loja
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("store_id", store_id);

    if (error || !subs?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }));
    }

    const payload = JSON.stringify({ title, body, tag: `lead-${lead_id}`, data: { lead_id } });

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subs) {
      try {
        const url = new URL(sub.endpoint);
        const audience = `${url.protocol}//${url.host}`;
        const jwt = await signVapid(audience);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
            TTL: "86400",
          },
          body: new TextEncoder().encode(payload),
        });

        if (res.ok || res.status === 201) {
          sent++;
        } else if (res.status === 410 || res.status === 404) {
          // Subscrição expirada — remover
          failed.push(sub.endpoint);
        }
      } catch (e) {
        console.warn("[send-push] erro ao enviar para", sub.endpoint, e);
      }
    }

    // Limpar subscrições expiradas
    if (failed.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", failed);
    }

    return new Response(JSON.stringify({ ok: true, sent, cleaned: failed.length }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[send-push-notification]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
