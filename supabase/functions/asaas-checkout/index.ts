// asaas-checkout: cria cliente e cobrança no Asaas
// Retorna link de pagamento para o frontend redirecionar
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_URL = "https://api.asaas.com/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Planos disponíveis
const PLANS = {
  monthly: {
    name: "CRM Ótica Dominante — Plano Tração Mensal",
    value: 250.00,
    cycle: "MONTHLY" as const,
    description: "Acesso completo ao CRM por 1 mês. Até 3 vendedores.",
  },
  annual_pix: {
    name: "CRM Ótica Dominante — Plano Tração Anual (PIX)",
    value: 2364.00,
    cycle: "NO_RECURRENCE" as const,
    description: "Acesso completo ao CRM por 12 meses. Até 3 vendedores. Pago via PIX à vista.",
  },
  annual_credit: {
    name: "CRM Ótica Dominante — Plano Tração Anual (12x)",
    value: 2364.00,
    cycle: "NO_RECURRENCE" as const,
    installments: 12,
    description: "Acesso completo ao CRM por 12 meses. Até 3 vendedores. Parcelado em 12x sem juros.",
  },
};

async function asaas(path: string, method = "GET", body?: object) {
  const res = await fetch(`${ASAAS_URL}${path}`, {
    method,
    headers: {
      "access_token": ASAAS_API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "OticaDominanteCRM/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

async function getOrCreateCustomer(email: string, name: string, cpfCnpj?: string) {
  // Buscar cliente existente pelo email
  const search = await asaas(`/customers?email=${encodeURIComponent(email)}`);
  if (search.status === 200 && search.data?.data?.length > 0) {
    return search.data.data[0].id;
  }

  // Criar novo cliente
  const create = await asaas("/customers", "POST", {
    name,
    email,
    cpfCnpj: cpfCnpj || undefined,
    notificationDisabled: false,
  });

  if (create.status >= 400) {
    throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(create.data)}`);
  }

  return create.data.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, Deno.env.get("ANON_KEY") ?? "")
      .auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: corsHeaders });

    const { plan_type, store_id, cpf_cnpj } = await req.json();

    if (!plan_type || !store_id) {
      return new Response(JSON.stringify({ error: "plan_type e store_id são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    const plan = PLANS[plan_type as keyof typeof PLANS];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), { status: 400, headers: corsHeaders });
    }

    // Buscar dados do usuário
    const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    const customerName = profile?.full_name || user.email?.split("@")[0] || "Cliente";
    const customerEmail = profile?.email || user.email || "";

    // Criar ou buscar cliente no Asaas
    const customerId = await getOrCreateCustomer(customerEmail, customerName, cpf_cnpj);

    // Criar cobrança
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // vence em 3 dias
    const dueDateStr = dueDate.toISOString().split("T")[0];

    const chargePayload: any = {
      customer: customerId,
      billingType: plan_type === "annual_pix" ? "PIX" :
                   plan_type === "annual_credit" ? "CREDIT_CARD" : "UNDEFINED",
      value: plan.value,
      dueDate: dueDateStr,
      description: plan.description,
      externalReference: `${store_id}:${plan_type}:${user.id}`,
      callback: {
        successUrl: `https://www.oticadominante.com.br/planos?status=success`,
        autoRedirect: true,
      },
    };

    // Parcelamento para anual crédito
    if (plan_type === "annual_credit") {
      chargePayload.installmentCount = 12;
      chargePayload.installmentValue = parseFloat((plan.value / 12).toFixed(2));
      chargePayload.billingType = "CREDIT_CARD";
    }

    // Assinatura recorrente para mensal
    if (plan_type === "monthly") {
      const subPayload = {
        customer: customerId,
        billingType: "UNDEFINED", // cliente escolhe PIX, boleto ou cartão
        value: plan.value,
        nextDueDate: dueDateStr,
        cycle: "MONTHLY",
        description: plan.description,
        externalReference: `${store_id}:monthly:${user.id}`,
        callback: {
          successUrl: `https://www.oticadominante.com.br/planos?status=success`,
          autoRedirect: true,
        },
      };

      const sub = await asaas("/subscriptions", "POST", subPayload);
      if (sub.status >= 400) {
        throw new Error(`Erro ao criar assinatura: ${JSON.stringify(sub.data)}`);
      }

      // Salvar referência da assinatura
      await admin.from("subscriptions").update({
        asaas_subscription_id: sub.data.id,
        asaas_customer_id: customerId,
      }).eq("store_id", store_id);

      return new Response(JSON.stringify({
        ok: true,
        payment_url: sub.data.invoiceUrl || sub.data.bankSlipUrl || `https://www.asaas.com/c/${sub.data.id}`,
        subscription_id: sub.data.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cobrança única (anual)
    const charge = await asaas("/payments", "POST", chargePayload);
    if (charge.status >= 400) {
      throw new Error(`Erro ao criar cobrança: ${JSON.stringify(charge.data)}`);
    }

    // Salvar referência
    await admin.from("subscriptions").update({
      asaas_customer_id: customerId,
      asaas_payment_id: charge.data.id,
    }).eq("store_id", store_id);

    return new Response(JSON.stringify({
      ok: true,
      payment_url: charge.data.invoiceUrl || charge.data.bankSlipUrl || `https://www.asaas.com/c/${charge.data.id}`,
      payment_id: charge.data.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[asaas-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
