// webhook-healthcheck: verifica todos os webhooks ativos e autocorrige
// os que estiverem sem o Authorization header.
// Disparado pelo pg_cron a cada 5 minutos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EXPECTED_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
const EXPECTED_AUTH_PREFIX = "Bearer ";

async function evo(path: string, init: RequestInit = {}) {
  const res = await fetch(`${EVO_URL}${path}`, {
    ...init,
    headers: {
      apikey: EVO_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

async function fixWebhook(instance: string): Promise<boolean> {
  const result = await evo(`/webhook/set/${instance}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        url: EXPECTED_WEBHOOK_URL,
        byEvents: false,
        base64: false,
        enabled: true,
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
      },
    }),
  });
  return result.status < 400;
}

Deno.serve(async (req) => {
  try {
    if (!EVO_URL || !EVO_KEY) {
      return new Response(JSON.stringify({ error: "Evolution API não configurada" }), { status: 500 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Busca todas as conexões ativas (não desconectadas)
    const { data: connections, error } = await admin
      .from("whatsapp_connections")
      .select("store_id, evolution_instance_name, status")
      .neq("status", "disconnected");

    if (error) {
      console.error("[healthcheck] erro ao buscar conexões:", error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!connections || connections.length === 0) {
      console.log("[healthcheck] nenhuma conexão ativa encontrada");
      return new Response(JSON.stringify({ ok: true, checked: 0, fixed: 0 }));
    }

    const results: { instance: string; store_id: string; status: string; action: string }[] = [];

    for (const conn of connections) {
      const instance = conn.evolution_instance_name ?? `loja-${conn.store_id}`;

      // Verifica webhook atual
      const { status: findStatus, data: webhookData } = await evo(`/webhook/find/${instance}`);

      // Instância não existe na Evolution — skip
      if (findStatus === 404) {
        results.push({ instance, store_id: conn.store_id, status: "not_found", action: "skipped" });
        console.log(`[healthcheck] instância não encontrada na Evolution: ${instance}`);
        continue;
      }

      const headers = webhookData?.headers ?? null;
      const authHeader = headers?.Authorization ?? headers?.authorization ?? null;
      const webhookUrl = webhookData?.url ?? "";

      // headers: null OU headers: {} (objeto vazio) sao ambos invalidos
      const headersEmpty = !headers || Object.keys(headers).length === 0;
      const hasCorrectAuth = !headersEmpty && !!authHeader && authHeader.startsWith(EXPECTED_AUTH_PREFIX);
      const hasCorrectUrl = webhookUrl === EXPECTED_WEBHOOK_URL;

      if (hasCorrectAuth && hasCorrectUrl) {
        results.push({ instance, store_id: conn.store_id, status: "ok", action: "none" });
        console.log(`[healthcheck] ok: ${instance}`);
        continue;
      }

      // Precisa corrigir
      const reason = !hasCorrectAuth ? "sem Authorization header" : "URL incorreta";
      console.warn(`[healthcheck] corrigindo ${instance} — ${reason}`);

      const fixed = await fixWebhook(instance);

      if (fixed) {
        // Registra no log da tabela de conexões
        await admin
          .from("whatsapp_connections")
          .update({ updated_at: new Date().toISOString() })
          .eq("store_id", conn.store_id);

        results.push({ instance, store_id: conn.store_id, status: "fixed", action: `autocorrigido (${reason})` });
        console.log(`[healthcheck] corrigido: ${instance}`);
      } else {
        results.push({ instance, store_id: conn.store_id, status: "error", action: "falha ao corrigir" });
        console.error(`[healthcheck] falha ao corrigir: ${instance}`);
      }
    }

    const fixed = results.filter(r => r.status === "fixed").length;
    const errors = results.filter(r => r.status === "error").length;

    console.log(`[healthcheck] concluído — ${results.length} verificadas, ${fixed} corrigidas, ${errors} erros`);

    return new Response(
      JSON.stringify({ ok: true, checked: results.length, fixed, errors, results }),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[webhook-healthcheck] erro geral:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
