// Admin endpoint: lists all stores and manages subscriptions.
// Restricted to a single super-admin email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_EMAIL = "headwaymidia@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autenticado" }, 401);

    const email = (userData.user.email ?? "").toLowerCase();
    if (email !== ADMIN_EMAIL) return json({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "list");

    if (action === "list") {
      const { data: stores, error } = await admin
        .from("stores")
        .select("id, name, owner_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ownerIds = [...new Set((stores ?? []).map((s) => s.owner_id))];
      const storeIds = (stores ?? []).map((s) => s.id);

      const [{ data: profiles }, { data: subs }] = await Promise.all([
        admin.from("profiles").select("id, email, full_name, whatsapp").in("id", ownerIds.length ? ownerIds : ["00000000-0000-0000-0000-000000000000"]),
        admin.from("subscriptions").select("*").in("store_id", storeIds.length ? storeIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const subMap = new Map((subs ?? []).map((s: any) => [s.store_id, s]));

      const rows = (stores ?? []).map((s: any) => {
        const owner = profileMap.get(s.owner_id);
        const sub = subMap.get(s.id);
        return {
          store_id: s.id,
          store_name: s.name,
          owner_email: owner?.email ?? null,
          owner_name: owner?.full_name ?? null,
          created_at: s.created_at,
          subscription_status: sub?.status ?? null,
          plan: sub?.plan ?? null,
          billing_cycle: sub?.billing_cycle ?? null,
          trial_ends_at: sub?.trial_ends_at ?? null,
          current_period_end: sub?.current_period_end ?? null,
        };
      });

      return json({ stores: rows });
    }

    const storeId = String(body.store_id ?? "");
    if (!storeId) return json({ error: "store_id obrigatório" }, 400);

    // Ensure subscription row exists
    const { data: existing } = await admin
      .from("subscriptions")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    if (action === "activate") {
      const payload = {
        store_id: storeId,
        status: "active",
        plan: existing?.plan ?? "pro",
        billing_cycle: existing?.billing_cycle ?? "monthly",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const { error } = existing
        ? await admin.from("subscriptions").update(payload).eq("store_id", storeId)
        : await admin.from("subscriptions").insert(payload);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "block") {
      const payload = {
        store_id: storeId,
        status: "blocked",
        plan: existing?.plan ?? "pro",
        billing_cycle: existing?.billing_cycle ?? "monthly",
      };
      const { error } = existing
        ? await admin.from("subscriptions").update({ status: "blocked" }).eq("store_id", storeId)
        : await admin.from("subscriptions").insert(payload);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "extend_trial") {
      const base = existing?.trial_ends_at ? new Date(existing.trial_ends_at) : new Date();
      const start = base.getTime() < Date.now() ? new Date() : base;
      const newEnd = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const payload = {
        store_id: storeId,
        status: "trial",
        plan: existing?.plan ?? "pro",
        billing_cycle: existing?.billing_cycle ?? "monthly",
        trial_ends_at: newEnd,
      };
      const { error } = existing
        ? await admin.from("subscriptions").update({ status: "trial", trial_ends_at: newEnd }).eq("store_id", storeId)
        : await admin.from("subscriptions").insert(payload);
      if (error) throw error;
      return json({ ok: true, trial_ends_at: newEnd });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e: any) {
    console.error("admin-stores error:", e);
    return json({ error: e?.message ?? "Erro interno" }, 500);
  }
});
