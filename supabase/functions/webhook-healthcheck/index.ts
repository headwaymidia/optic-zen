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
const ADMIN_EMAIL = "headwaymidia@gmail.com";

// Envia notificação interna quando loja desconecta
async function notifyDisconnection(admin: any, storeId: string, storeName: string, instance: string) {
  try {
    // Verificar se já existe notificação recente (última hora) para evitar spam
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("store_id", storeId)
      .eq("type", "whatsapp_disconnected")
      .gte("created_at", oneHourAgo)
      .maybeSingle();

    if (existing) return; // Já notificou na última hora

    // Buscar donos/gerentes da loja para notificar
    const { data: members } = await admin
      .from("store_members")
      .select("user_id")
      .eq("store_id", storeId)
      .in("role", ["Dono", "Gerente"]);

    // Inserir notificação para cada membro responsável
    if (members && members.length > 0) {
      await admin.from("notifications").insert(
        members.map((m: any) => ({
          user_id: m.user_id,
          store_id: storeId,
          type: "whatsapp_disconnected",
          title: "⚠️ WhatsApp desconectado",
          body: `A loja "${storeName}" está com WhatsApp desconectado. Acesse as configurações para reconectar.`,
          read: false,
        }))
      );
    }

    // Inserir no log centralizado
    await admin.from("logs").insert({
      store_id: storeId,
      level: "warn",
      message: `[healthcheck] WhatsApp desconectado: ${instance}`,
    });

    console.warn(`[healthcheck] ⚠️ desconexão detectada: ${storeName} (${instance})`);
  } catch (e) {
    console.error("[healthcheck] erro ao notificar desconexão:", e);
  }
}


// Fetch com timeout para evitar travamentos esperando Evolution API
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function evo(path: string, init: RequestInit = {}) {
  const res = await fetchWithTimeout(`${EVO_URL}${path}`, {
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

      // Verificar estado de conexão da instância
      const { status: stateStatus, data: stateData } = await evo(`/instance/connectionState/${instance}`);
      if (stateStatus < 400) {
        const evoState = stateData?.instance?.state ?? stateData?.state ?? "";
        const isDisconnected = evoState !== "open" && evoState !== "connecting";
        if (isDisconnected && conn.status === "connected") {
          // Buscar nome da loja para a notificação
          const { data: store } = await admin
            .from("stores")
            .select("name")
            .eq("id", conn.store_id)
            .maybeSingle();
          await notifyDisconnection(admin, conn.store_id, store?.name ?? conn.store_id, instance);
          // Atualizar status no banco
          await admin
            .from("whatsapp_connections")
            .update({ status: "disconnected" })
            .eq("store_id", conn.store_id);
        }
      }

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
