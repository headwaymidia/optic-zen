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
    let userId: string | undefined = body.user_id;
    let email: string | undefined = body.email;
    let name: string | undefined = body.name;

    // Webhook payload (Supabase DB webhook on stores insert)
    if (!userId && body.record?.owner_id) userId = body.record.owner_id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (userId && (!email || !name)) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .maybeSingle();
      email = email || profile?.email || undefined;
      name = name || profile?.full_name || undefined;

      if (!email) {
        const { data: u } = await admin.auth.admin.getUserById(userId);
        email = u?.user?.email ?? undefined;
        name = name || (u?.user?.user_metadata as any)?.full_name;
      }
    }

    if (!email) throw new Error("Email do usuário não encontrado");

    const firstName = (name || "").split(" ")[0] || "tudo bem";

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f7f7f7;padding:24px;color:#222">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:22px">Olá, ${firstName}! 👋</h1>
    <p style="line-height:1.5">Seu período de teste de <strong>14 dias</strong> começou agora. Você tem acesso completo a todas as funcionalidades do CRM.</p>
    <h2 style="font-size:16px;margin:24px 0 12px">Próximos passos</h2>
    <ol style="line-height:1.7;padding-left:20px">
      <li>Adicione seu primeiro lead no <strong>Funil de vendas</strong></li>
      <li>Convide sua equipe em <strong>Configurações → Equipe</strong></li>
      <li>Explore o <strong>Dashboard</strong> para acompanhar seus resultados</li>
    </ol>
    <div style="text-align:center;margin:32px 0">
      <a href="https://optic-zen.lovable.app" style="background:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;display:inline-block;font-weight:600">Acessar meu CRM</a>
    </div>
    <p style="font-size:13px;color:#666;margin-top:32px">Dúvidas? Fale com nosso suporte: <a href="https://wa.me/5522974017994" style="color:#111">wa.me/5522974017994</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="font-size:12px;color:#999;text-align:center">Equipe Ótica Dominante — Powered by Headway Mídia</p>
  </div>
</body></html>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ótica Dominante <contato@oticadominante.com.br>",
        to: [email],
        subject: "Bem-vindo ao CRM Ótica Dominante 👁️",
        html,
      }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(data)}`);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-welcome-email error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
