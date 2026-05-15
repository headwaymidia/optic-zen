import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_EMAIL = "headwaymidia@gmail.com";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) throw new Error("Token inválido");
    if (user.email !== ADMIN_EMAIL) throw new Error("Acesso negado");
    const body = await req.json().catch(()=>({}));
    const { action, store_id, days } = body;
    if (action === "list") {
      const { data: stores } = await admin.from("stores").select("id, name, created_at, owner_id").order("created_at", {
        ascending: false
      });
      const result = [];
      for (const store of stores || []){
        const { data: sub } = await admin.from("subscriptions").select("status, trial_ends_at, plan, billing_cycle").eq("store_id", store.id).maybeSingle();
        const { data: u } = await admin.auth.admin.getUserById(store.owner_id);
        const { data: profile } = await admin.from("profiles").select("whatsapp, full_name").eq("id", store.owner_id).maybeSingle();
        result.push({
          id: store.id,
          name: store.name,
          email: u?.user?.email || "—",
          phone: profile?.whatsapp || "—",
          owner_name: profile?.full_name || "—",
          created_at: store.created_at,
          status: sub?.status || "—",
          trial_ends_at: sub?.trial_ends_at || null,
          plan_type: sub?.plan || "—",
          billing_cycle: sub?.billing_cycle || "—"
        });
      }
      return new Response(JSON.stringify({
        data: result
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (action === "activate") {
      await admin.from("subscriptions").update({
        status: "active",
        trial_ends_at: null
      }).eq("store_id", store_id);
      return new Response(JSON.stringify({
        ok: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (action === "block") {
      await admin.from("subscriptions").update({
        status: "blocked"
      }).eq("store_id", store_id);
      return new Response(JSON.stringify({
        ok: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (action === "extend") {
      const d = days || 30;
      await admin.from("subscriptions").update({
        status: "trial",
        trial_ends_at: new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString()
      }).eq("store_id", store_id);
      return new Response(JSON.stringify({
        ok: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    throw new Error("Ação inválida");
  } catch (e) {
    return new Response(JSON.stringify({
      error: e.message
    }), {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
