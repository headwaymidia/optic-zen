// Importa o HISTORICO de conversas direto da Evolution, sob demanda.
//
// Problema que resolve: se a sessao do WhatsApp cai (tipico no fim de semana) e a
// vendedora responde pelo celular, essas mensagens nao passam pelo webhook e a
// conversa aparece vazia no CRM na segunda. Antes, so uma reconexao com QR novo
// (evento MESSAGES_SET) trazia esse historico.
//
// Aqui o CRM PERGUNTA para a Evolution o que existe e importa o que falta.
// Seguro por construcao: NAO desconecta, NAO mexe na sessao, NAO dispara push nem
// badge (sao mensagens antigas), e nunca duplica (upsert por message_id).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Limites para nao estourar o tempo da edge function.
const MAX_CHATS = 60;          // conversas processadas por execucao
const MAX_MSGS_PER_CHAT = 60;  // mensagens por conversa
const DEFAULT_DAYS = 7;        // janela padrao

function digitsOnly(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

function extractText(message: any): string {
  if (!message) return "";
  return message.conversation
    || message.extendedTextMessage?.text
    || message.imageMessage?.caption
    || message.videoMessage?.caption
    || message.documentMessage?.caption
    || message.buttonsResponseMessage?.selectedDisplayText
    || message.listResponseMessage?.title
    || "";
}

function detectMediaType(message: any): string | null {
  if (!message) return null;
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.stickerMessage) return "sticker";
  return null;
}

/**
 * Telefone real da conversa. Conversas novas chegam como "@lid" (id interno do
 * WhatsApp) e o numero verdadeiro vem em remoteJidAlt — sem isto o lead seria
 * criado com um numero invalido.
 */
function phoneFromKey(remoteJid: string, remoteJidAlt?: string | null): string {
  const source = remoteJid.endsWith("@lid") && remoteJidAlt ? remoteJidAlt : remoteJid;
  return digitsOnly(source.split("@")[0]);
}

async function evo(path: string, init: RequestInit = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${EVO_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { apikey: EVO_KEY, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    return { status: res.status, data };
  } finally {
    clearTimeout(id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!EVO_URL || !EVO_KEY) throw new Error("Evolution API não configurada.");

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const storeId = String(body.store_id ?? "");
    const days = Math.min(Math.max(Number(body.days ?? DEFAULT_DAYS), 1), 30);
    if (!storeId) throw new Error("store_id é obrigatório");

    // Somente membros da loja (qualquer papel) podem sincronizar a propria loja.
    const { data: member } = await admin
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Sem permissão nesta loja" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn } = await admin
      .from("whatsapp_connections")
      .select("evolution_instance_name")
      .eq("store_id", storeId)
      .maybeSingle();
    const instance = conn?.evolution_instance_name;
    if (!instance) throw new Error("Loja sem instância de WhatsApp configurada.");

    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

    // 1) Conversas conhecidas pela Evolution
    const chatsRes = await evo(`/chat/findChats/${instance}`, { method: "POST", body: "{}" });
    if (chatsRes.status >= 400) {
      throw new Error(`Evolution não retornou as conversas (${chatsRes.status}).`);
    }
    const rawChats = Array.isArray(chatsRes.data) ? chatsRes.data : (chatsRes.data?.chats ?? []);

    // Só conversas com movimento na janela; mais recentes primeiro.
    const chats = rawChats
      .filter((c: any) => {
        const jid = c?.remoteJid ?? "";
        if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") return false;
        const upd = c?.updatedAt ? new Date(c.updatedAt).getTime() : 0;
        return upd >= cutoffMs;
      })
      .sort((a: any, b: any) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .slice(0, MAX_CHATS);

    let imported = 0, skipped = 0, leadsCreated = 0;
    const touched = new Map<string, { ts: string; preview: string }>();

    for (const chat of chats) {
      const remoteJid: string = chat.remoteJid;
      try {
        // 2) Mensagens da conversa
        const msgsRes = await evo(`/chat/findMessages/${instance}`, {
          method: "POST",
          body: JSON.stringify({ where: { key: { remoteJid } } }),
        });
        if (msgsRes.status >= 400) { skipped++; continue; }
        const records: any[] = msgsRes.data?.messages?.records ?? [];

        // Mais recentes primeiro, limitado
        const recent = records
          .filter((m) => {
            const ts = m?.messageTimestamp ? Number(m.messageTimestamp) * 1000 : NaN;
            return Number.isFinite(ts) && ts >= cutoffMs;
          })
          .sort((a, b) => Number(b.messageTimestamp) - Number(a.messageTimestamp))
          .slice(0, MAX_MSGS_PER_CHAT);
        if (recent.length === 0) continue;

        // 3) Lead correspondente (cria se nao existir)
        const phoneDigits = phoneFromKey(remoteJid, recent[0]?.key?.remoteJidAlt ?? chat.remoteJidAlt);
        const last10 = phoneDigits.slice(-10);
        if (!last10) { skipped++; continue; }

        const { data: found } = await admin.rpc("find_lead_by_phone", {
          p_store_id: storeId, p_last10: last10,
        });
        let leadId: string | null = found ?? null;

        if (!leadId) {
          const fullPhone = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
          const pushName = recent.find((m) => !m?.key?.fromMe)?.pushName || chat.pushName || null;
          const oldest = recent[recent.length - 1];
          const createdAt = new Date(Number(oldest.messageTimestamp) * 1000).toISOString();
          const anyInbound = recent.some((m) => !m?.key?.fromMe);
          const { data: newLead } = await admin.from("leads").upsert({
            store_id: storeId,
            name: pushName || `+${fullPhone}`,
            phone: fullPhone,
            status: anyInbound ? "Novo Lead" : "Em Atendimento",
            lead_source: "WhatsApp",
            created_at: createdAt,
            updated_at: new Date().toISOString(),
          }, { onConflict: "store_id,phone", ignoreDuplicates: false }).select("id").maybeSingle();
          leadId = newLead?.id ?? null;
          if (leadId) leadsCreated++;
        }
        if (!leadId) { skipped++; continue; }

        // 4) Importa as mensagens (upsert por message_id — nunca duplica)
        for (const m of recent) {
          const messageId = m?.key?.id;
          if (!messageId) { skipped++; continue; }
          const text = extractText(m.message);
          const mediaType = detectMediaType(m.message);
          if (!text && !mediaType) { skipped++; continue; }
          const fromMe = Boolean(m?.key?.fromMe);
          const timestamp = new Date(Number(m.messageTimestamp) * 1000).toISOString();

          const { error: insErr } = await admin.from("whatsapp_messages").upsert({
            store_id: storeId,
            lead_id: leadId,
            instance_name: instance,
            remote_jid: remoteJid,
            message_id: messageId,
            from_me: fromMe,
            body: text || null,
            media_type: mediaType,
            media_url: null, // historico: nao baixa midia (caro e sao msgs antigas)
            timestamp,
            status: fromMe ? "sent" : "received",
          }, { onConflict: "message_id", ignoreDuplicates: true });
          if (insErr) { skipped++; continue; }
          imported++;

          const prev = touched.get(leadId);
          if (!prev || prev.ts < timestamp) {
            touched.set(leadId, {
              ts: timestamp,
              preview: (text || (mediaType ? `[${mediaType}]` : "")).slice(0, 100),
            });
          }
        }
      } catch (_e) {
        skipped++;
      }
    }

    // 5) Reordena a lista de conversas — nunca "volta" um lead no tempo.
    for (const [leadId, info] of touched) {
      try {
        const { data: cur } = await admin
          .from("leads").select("last_message_at").eq("id", leadId).maybeSingle();
        const curMs = cur?.last_message_at ? new Date(cur.last_message_at).getTime() : 0;
        if (curMs < new Date(info.ts).getTime()) {
          await admin.from("leads").update({
            last_message_at: info.ts,
            last_message_preview: info.preview,
            updated_at: new Date().toISOString(),
          }).eq("id", leadId);
        }
      } catch (_e) { /* segue */ }
    }

    const summary = {
      ok: true,
      chats_verificadas: chats.length,
      mensagens_importadas: imported,
      leads_criados: leadsCreated,
      ignoradas: skipped,
      dias: days,
    };
    console.log(`[sync-history] ${instance}:`, JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[sync-history] erro:", err?.message ?? err);
    return new Response(JSON.stringify({ error: err?.message ?? "Erro inesperado" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
