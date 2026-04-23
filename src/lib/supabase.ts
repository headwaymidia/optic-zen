import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://fxcgvlukzjmwzpzuvzcp.supabase.co",
  "sb_publishable_BgnFYgwfBCXxZcqO2rQJWA_qDAjT4_R"
);

export type LeadStatus =
  | "Novo Lead"
  | "Aguardando Resposta"
  | "Agendou Exame"
  | "Não Compareceu"
  | "Compareceu e Comprou"
  | "Compareceu e Não Comprou"
  | "Repescagem";

export type LeadPriority = "Baixa" | "Média" | "Alta";

export const LEAD_STATUSES: LeadStatus[] = [
  "Novo Lead",
  "Aguardando Resposta",
  "Agendou Exame",
  "Não Compareceu",
  "Compareceu e Comprou",
  "Compareceu e Não Comprou",
  "Repescagem",
];

export interface Lead {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  status: LeadStatus;
  priority: LeadPriority | null;
  notes: string | null;
  responsible_id: string | null;
  sale_value: number | null;
  last_interaction: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}