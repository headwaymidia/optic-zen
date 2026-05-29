// Auto Repescagem — Edge Function
// Roda a cada 1h via pg_cron. Move leads que estão "Em Atendimento" ou
// "Aguardando Resposta" com follow_up_count >= 5 e last_follow_up_at >= 24h
// atrás para o status "Repescagem", marcando follow_up_date para hoje
// (assim aparecem em "Oportunidades" na tela Tarefas).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };

const MAX_FOLLOW_UPS = 5;
const COOLDOWN_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Proteção: exige header secreto compartilhado com o cron job
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== "oticadominante@2024") {
    return new Response(
      JSON.stringify({ ok: false, error: "Unauthorized" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Cutoff: leads cujo último follow-up foi há mais de COOLDOWN_HOURS
    const cutoffIso = new Date(
      Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000,
    ).toISOString();
    const todayIso = new Date().toISOString().slice(0, 10);

    // Busca candidatos
    const { data: candidates, error: selectError } = await supabase
      .from("leads")
      .select("id, name, status, follow_up_count, last_follow_up_at")
      .in("status", ["Em Atendimento", "Aguardando Resposta"])
      .gte("follow_up_count", MAX_FOLLOW_UPS)
      .not("last_follow_up_at", "is", null)
      .lte("last_follow_up_at", cutoffIso);

    if (selectError) throw selectError;

    const ids = (candidates ?? []).map((l) => l.id);

    if (ids.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          moved: 0,
          message: "Nenhum lead para mover",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Atualiza em bloco
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: "Repescagem",
        follow_up_date: todayIso,
      })
      .in("id", ids);

    if (updateError) throw updateError;

    console.log(`auto-repescagem: ${ids.length} leads movidos`, {
      ids,
      cutoffIso,
    });

    return new Response(
      JSON.stringify({ ok: true, moved: ids.length, ids }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("auto-repescagem error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
