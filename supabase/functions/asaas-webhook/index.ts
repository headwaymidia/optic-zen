// asaas-webhook: recebe eventos de pagamento do Asaas
// Ativa ou bloqueia planos automaticamente
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "od_crm_asaas_2026";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  try {
    // Validar token do webhook
    const token = req.headers.get("asaas-access-token") || req.headers.get("authorization");
    if (token !== WEBHOOK_TOKEN && token !== `Bearer ${WEBHOOK_TOKEN}`) {
      console.warn("[asaas-webhook] token inválido:", token);
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = await req.json();
    const { event, payment, subscription } = payload;

    console.log("[asaas-webhook] evento:", event, payment?.id || subscription?.id);

    // Extrair externalReference (store_id:plan_type:user_id)
    const ref = payment?.externalReference || subscription?.externalReference || "";
    const [storeId, planType] = ref.split(":");

    if (!storeId) {
      console.warn("[asaas-webhook] sem storeId no externalReference:", ref);
      return new Response(JSON.stringify({ ok: true }));
    }

    // Calcular data de expiração do plano
    function getPeriodEnd(plan: string): string {
      const now = new Date();
      if (plan === "monthly") {
        now.setMonth(now.getMonth() + 1);
      } else {
        // annual
        now.setFullYear(now.getFullYear() + 1);
      }
      return now.toISOString();
    }

    switch (event) {
      // Pagamento confirmado
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const periodEnd = getPeriodEnd(planType);
        await admin.from("subscriptions").update({
          status: "active",
          plan: "pro",
          billing_cycle: planType === "monthly" ? "monthly" : "yearly",
          current_period_end: periodEnd,
          trial_ends_at: null,
          asaas_payment_id: payment?.id,
        }).eq("store_id", storeId);

        console.log("[asaas-webhook] plano ativado:", storeId, planType, periodEnd);
        break;
      }

      // Assinatura confirmada (mensal recorrente)
      case "SUBSCRIPTION_CREATED":
      case "SUBSCRIPTION_UPDATED": {
        if (subscription?.status === "ACTIVE") {
          const periodEnd = getPeriodEnd("monthly");
          await admin.from("subscriptions").update({
            status: "active",
            plan: "pro",
            billing_cycle: "monthly",
            current_period_end: periodEnd,
            trial_ends_at: null,
            asaas_subscription_id: subscription?.id,
          }).eq("store_id", storeId);
          console.log("[asaas-webhook] assinatura ativada:", storeId);
        }
        break;
      }

      // Pagamento vencido/cancelado — bloquear loja
      case "PAYMENT_OVERDUE":
      case "PAYMENT_DELETED":
      case "SUBSCRIPTION_CANCELLED":
      case "SUBSCRIPTION_DELETED": {
        await admin.from("subscriptions").update({
          status: "blocked",
        }).eq("store_id", storeId);
        console.log("[asaas-webhook] plano bloqueado:", storeId, event);
        break;
      }

      default:
        console.log("[asaas-webhook] evento ignorado:", event);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[asaas-webhook] erro:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
