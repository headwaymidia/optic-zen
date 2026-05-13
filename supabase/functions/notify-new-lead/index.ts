import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const lead_id: string | undefined = body.lead_id;
    if (!lead_id) throw new Error("lead_id is required");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Buscar lead
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, name, phone, lead_source, store_id, created_at")
      .eq("id", lead_id)
      .maybeSingle();
    if (leadErr) throw leadErr;
    if (!lead) throw new Error("Lead não encontrado");

    if (lead.lead_source !== "WhatsApp") {
      return new Response(JSON.stringify({ skipped: true, reason: "lead_source != WhatsApp" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar dono da loja
    const { data: store } = await admin
      .from("stores")
      .select("id, name, owner_id")
      .eq("id", lead.store_id)
      .maybeSingle();
    if (!store?.owner_id) throw new Error("Loja sem dono");

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", store.owner_id)
      .maybeSingle();

    let email = ownerProfile?.email;
    if (!email) {
      const { data: u } = await admin.auth.admin.getUserById(store.owner_id);
      email = u?.user?.email ?? undefined;
    }
    if (!email) throw new Error("E-mail do dono não encontrado");

    const ownerName = (ownerProfile?.full_name ?? "").split(" ")[0] || "Olá";

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f7f7f7;padding:24px;color:#222">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:22px">${ownerName}, novo lead pelo WhatsApp! 🎉</h1>
    <p style="line-height:1.5">Você recebeu um novo lead em <strong>${store.name}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px 0;color:#666">Nome</td><td style="padding:8px 0;font-weight:600">${lead.name ?? "—"}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Telefone</td><td style="padding:8px 0;font-weight:600">${lead.phone ?? "—"}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Origem</td><td style="padding:8px 0;font-weight:600">WhatsApp</td></tr>
    </table>
    <div style="text-align:center;margin:32px 0">
      <a href="https://optic-zen.lovable.app/whatsapp" style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;display:inline-block;font-weight:600">Atender agora</a>
    </div>
    <p style="font-size:12px;color:#999;text-align:center;margin-top:32px">Equipe Ótica Dominante</p>
  </div>
</body></html>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ótica Dominante <onboarding@resend.dev>",
        to: [email],
        subject: `Novo lead pelo WhatsApp: ${lead.name}`,
        html,
      }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(data)}`);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-new-lead error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
