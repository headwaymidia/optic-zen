import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(SUPABASE_URL!, SERVICE_KEY!);
  const results: string[] = [];
  const { data: connections } = await admin.from("whatsapp_connections").select("store_id, evolution_instance_name, status").eq("status", "connected").not("evolution_instance_name", "is", null);
  for (const conn of connections ?? []) {
    const instance = conn.evolution_instance_name;
    if (!instance || !EVOLUTION_URL) continue;
    try {
      const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instance}`, { headers: { apikey: EVOLUTION_KEY! }, signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      const state = data?.instance?.state ?? "unknown";
      if (state === "open") {
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { count } = await admin.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("store_id", conn.store_id).eq("status", "sending").eq("from_me", true).lt("created_at", twoMinAgo);
        if ((count ?? 0) > 0) {
          results.push(`${instance}: ${count} msgs PENDING - reconectando`);
          await fetch(`${EVOLUTION_URL}/instance/logout/${instance}`, { method: "DELETE", headers: { apikey: EVOLUTION_KEY! } });
          await new Promise(r => setTimeout(r, 2000));
          await fetch(`${EVOLUTION_URL}/instance/connect/${instance}`, { headers: { apikey: EVOLUTION_KEY! } });
          const { data: members } = await admin.from("store_members").select("user_id").eq("store_id", conn.store_id).in("role", ["Dono", "Gerente"]);
          if (members?.length) await admin.from("notifications").insert(members.map((m: any) => ({ user_id: m.user_id, store_id: conn.store_id, type: "whatsapp_disconnected", title: "WhatsApp reconectando", body: "Mensagens nao entregues detectadas. Reconectando automaticamente.", read: false })));
        } else { results.push(`${instance}: ok`); }
      } else {
        results.push(`${instance}: ${state} - reconectando`);
        await fetch(`${EVOLUTION_URL}/instance/connect/${instance}`, { headers: { apikey: EVOLUTION_KEY! } });
        await admin.from("whatsapp_connections").update({ status: "disconnected" }).eq("store_id", conn.store_id);
        const { data: members } = await admin.from("store_members").select("user_id").eq("store_id", conn.store_id).in("role", ["Dono", "Gerente"]);
        if (members?.length) await admin.from("notifications").insert(members.map((m: any) => ({ user_id: m.user_id, store_id: conn.store_id, type: "whatsapp_disconnected", title: "WhatsApp desconectado", body: "Reconecte em Configuracoes > WhatsApp.", read: false })));
      }
    } catch(e: any) { results.push(`${instance}: erro ${e.message}`); }
  }
  return new Response(JSON.stringify({ ok: true, results }), { headers: { ...cors, "Content-Type": "application/json" } });
});
