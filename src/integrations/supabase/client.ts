import { createClient } from "@supabase/supabase-js";

// Projeto Supabase oficial do usuário (crm-optico)
const SUPABASE_URL = "https://agmtsuaudrabiufpsrmr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_du0PZdxRhmp_JqHEaLipng_sk0i3HS2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Re-exporta tipos/constantes de domínio para manter compatibilidade dos imports.
export * from "@/lib/leads-constants";
