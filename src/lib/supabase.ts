import { createClient } from "@supabase/supabase-js";

// Projeto Supabase oficial do usuário (crm-optico)
const SUPABASE_URL = "https://fxcgvlukzjmwzpzuvzcp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_BgnFYgwfBCXxZcqO2rQJWA_qDAjT4_R";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export * from "./leads-constants";
