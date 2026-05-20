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
      const { data: stores } = await admin.from("stores").select("id, name, created_at, owner_id").order("created_at", { ascending: false });

      // Buscar dados agregados em paralelo para performance
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [subsRes, connectionsRes, messagesRes, leadsRes, membersRes] = await Promise.all([
        admin.from("subscriptions").select("store_id, status, trial_ends_at, plan, billing_cycle, current_period_end"),
        admin.from("whatsapp_connections").select("store_id, status, evolution_instance_name, updated_at"),
        admin.from("whatsapp_messages").select("store_id, created_at").gte("created_at", sevenDaysAgo),
        admin.from("leads").select("store_id, created_at").gte("created_at", sevenDaysAgo),
        admin.from("store_members").select("store_id"),
      ]);

      // Última mensagem por loja (para detectar inatividade)
      const { data: lastMsgs } = await admin
        .from("whatsapp_messages")
        .select("store_id, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      // Indexar por store_id
      const subsMap = Object.fromEntries((subsRes.data || []).map(s => [s.store_id, s]));
      const connMap = Object.fromEntries((connectionsRes.data || []).map(c => [c.store_id, c]));
      const msgs7d = (messagesRes.data || []).reduce((acc, m) => { acc[m.store_id] = (acc[m.store_id] || 0) + 1; return acc; }, {});
      const leads7d = (leadsRes.data || []).reduce((acc, l) => { acc[l.store_id] = (acc[l.store_id] || 0) + 1; return acc; }, {});
      const membersCount = (membersRes.data || []).reduce((acc, m) => { acc[m.store_id] = (acc[m.store_id] || 0) + 1; return acc; }, {});
      const lastActivityMap = (lastMsgs || []).reduce((acc, m) => { if (!acc[m.store_id]) acc[m.store_id] = m.created_at; return acc; }, {});

      const result = [];
      for (const store of stores || []) {
        const sub = subsMap[store.id];
        const conn = connMap[store.id];
        const { data: u } = await admin.auth.admin.getUserById(store.owner_id);
        const { data: profile } = await admin.from("profiles").select("whatsapp, full_name").eq("id", store.owner_id).maybeSingle();

        const lastActivity = lastActivityMap[store.id] || null;
        const daysSinceActivity = lastActivity
          ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : null;

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
          billing_cycle: sub?.billing_cycle || "—",
          current_period_end: sub?.current_period_end || null,
          // Métricas novas
          whatsapp_status: conn?.status || "disconnected",
          whatsapp_instance: conn?.evolution_instance_name || null,
          messages_7d: msgs7d[store.id] || 0,
          leads_7d: leads7d[store.id] || 0,
          members_count: membersCount[store.id] || 0,
          last_activity: lastActivity,
          days_since_activity: daysSinceActivity,
          is_inactive: daysSinceActivity === null || daysSinceActivity > 7,
        });
      }

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (action === "activate" || action === "activate_monthly" || action === "activate_yearly") {
      const isYearly = action === "activate_yearly";
      const isMonthly = action === "activate_monthly";
      const now = new Date();
      let periodEnd: string | null = null;
      if (isYearly) {
        periodEnd = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      } else if (isMonthly) {
        periodEnd = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      }
      await admin.from("subscriptions").update({
        status: "active",
        trial_ends_at: null,
        billing_cycle: isYearly ? "yearly" : isMonthly ? "monthly" : undefined,
        current_period_end: periodEnd,
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
