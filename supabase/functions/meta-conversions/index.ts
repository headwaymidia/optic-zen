// meta-conversions: dispara eventos para a Meta Conversions API (server-side)
// Mais confiável que pixel no browser — não é bloqueado por iOS/adblockers
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_API_VERSION = "v21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash SHA-256 para dados do usuário (exigido pela Meta)
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Normalizar telefone para formato E.164 sem + (ex: 5511999999999)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 11) return `55${digits}`;
  if (digits.length === 10) return `55${digits}`;
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const {
      store_id,
      event_name,   // "Lead" | "Schedule" | "Purchase"
      lead_phone,   // telefone do lead
      lead_name,    // nome do lead
      value,        // valor da venda (só para Purchase)
      currency,     // "BRL"
      event_id,     // ID único do evento (para deduplicação)
    } = await req.json();

    if (!store_id || !event_name) {
      return new Response(JSON.stringify({ error: "store_id e event_name são obrigatórios" }), {
        status: 400, headers: corsHeaders
      });
    }

    // Buscar Pixel ID e token da loja
    const { data: store } = await admin
      .from("stores")
      .select("meta_pixel_id, meta_access_token, name")
      .eq("id", store_id)
      .maybeSingle();

    if (!store?.meta_pixel_id || !store?.meta_access_token) {
      // Sem configuração — ignorar silenciosamente
      return new Response(JSON.stringify({ ok: true, skipped: "no pixel configured" }), {
        headers: corsHeaders
      });
    }

    // Preparar user_data com hashes
    const userData: Record<string, string> = {};
    if (lead_phone) {
      const normalized = normalizePhone(lead_phone);
      userData.ph = await sha256(normalized);
    }
    if (lead_name) {
      const parts = lead_name.trim().split(" ");
      userData.fn = await sha256(parts[0]);
      if (parts.length > 1) userData.ln = await sha256(parts.slice(1).join(" "));
    }

    // Montar payload do evento
    const eventData: Record<string, any> = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "system_generated",
      event_id: event_id || `${store_id}-${event_name}-${Date.now()}`,
      user_data: userData,
    };

    // Dados customizados para Purchase
    if (event_name === "Purchase" && value) {
      eventData.custom_data = {
        value: parseFloat(value),
        currency: currency || "BRL",
      };
    }

    // Chamar Meta Conversions API
    const url = `https://graph.facebook.com/${META_API_VERSION}/${store.meta_pixel_id}/events?access_token=${store.meta_access_token}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [eventData] }),
    });

    const result = await res.json();
    console.log(`[meta-conversions] ${store.name} | ${event_name} | status:${res.status}`, JSON.stringify(result));

    if (res.status >= 400) {
      console.error("[meta-conversions] erro da API Meta:", result);
    }

    return new Response(JSON.stringify({ ok: true, meta_response: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[meta-conversions] erro:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
