import { createClient } from "@supabase/supabase-js";

const REMEMBER_KEY = "od.auth.remember";

/**
 * Storage adaptativo: usa localStorage quando o usuário marca "Lembrar minha sessão"
 * (persistência entre fechamentos do navegador) e sessionStorage caso contrário
 * (sessão expira ao fechar a aba/navegador).
 */
function createAdaptiveStorage() {
  if (typeof window === "undefined") return undefined as unknown as Storage;

  const pickStore = (): Storage => {
    const remember = window.localStorage.getItem(REMEMBER_KEY) !== "false";
    return remember ? window.localStorage : window.sessionStorage;
  };

  return {
    getItem: (key: string) => {
      // Lê de ambos para resiliência (preferindo o store ativo)
      return pickStore().getItem(key) ?? window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
      const active = pickStore();
      active.setItem(key, value);
      // Limpa o outro storage para evitar sessão duplicada
      const other = active === window.localStorage ? window.sessionStorage : window.localStorage;
      other.removeItem(key);
    },
    removeItem: (key: string) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  } as Storage;
}

/**
 * Define a preferência de "Lembrar minha sessão". Deve ser chamado ANTES
 * de signInWithPassword para que o storage correto seja usado na gravação.
 */
export function setRememberSession(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
}

export const supabase = createClient(
  "https://fxcgvlukzjmwzpzuvzcp.supabase.co",
  "sb_publishable_BgnFYgwfBCXxZcqO2rQJWA_qDAjT4_R",
  {
    auth: {
      storage: createAdaptiveStorage(),
      storageKey: "od.auth.session",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export type LeadStatus =
  | "Novo Lead"
  | "Em Atendimento"
  | "Aguardando Resposta"
  | "Agendou Exame"
  | "Não Compareceu"
  | "Compareceu e Comprou"
  | "Compareceu e Não Comprou"
  | "Repescagem";

export type LeadPriority = "Baixa" | "Média" | "Alta";

export const LEAD_STATUSES: LeadStatus[] = [
  "Novo Lead",
  "Em Atendimento",
  "Aguardando Resposta",
  "Agendou Exame",
  "Não Compareceu",
  "Compareceu e Comprou",
  "Compareceu e Não Comprou",
  "Repescagem",
];

export const LEAD_SOURCES = [
  "Instagram",
  "Google Ads",
  "WhatsApp",
  "Indicação",
  "Facebook",
  "Loja Física",
  "Outro",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const SALESPEOPLE = ["Maria", "Juliana", "Ana"] as const;
export type Salesperson = (typeof SALESPEOPLE)[number];

export const INTEREST_TAGS = [
  "Exame",
  "Multifocal",
  "Solar",
  "Lentes de Contato",
  "Armação",
  "Infantil",
] as const;
export type InterestTag = (typeof INTEREST_TAGS)[number];

export const LAB_STATUSES = [
  "Enviado ao Lab",
  "Em Produção",
  "Pronto para Retirada",
  "Entregue",
] as const;
export type LabStatus = (typeof LAB_STATUSES)[number];

export interface Prescription {
  esferico_od?: string | null;
  cilindrico_od?: string | null;
  eixo_od?: string | null;
  esferico_oe?: string | null;
  cilindrico_oe?: string | null;
  eixo_oe?: string | null;
  adicao?: string | null;
  dnp?: string | null;
}

export interface Lead {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  status: LeadStatus;
  priority: LeadPriority | null;
  notes: string | null;
  responsible_id: string | null;
  sale_value: number | null;
  last_interaction: string | null;
  lead_source: LeadSource | string | null;
  interest_tag: InterestTag | string | null;
  prescription: Prescription | null;
  assigned_to: string | null;
  delivery_prediction: string | null;
  lab_status: LabStatus | string | null;
  bairro: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  data_ultimo_exame: string | null;
  follow_up_date: string | null;
  follow_up_count: number;
  last_follow_up_at: string | null;
  last_inbound_at: string | null;
  next_return_date: string | null;
  exam_date: string | null;
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