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

export const PRIORITIES: LeadPriority[] = ["Baixa", "Média", "Alta"];

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
  "Pedido feito",
  "Em produção",
  "Pronto no laboratório",
  "Retirado pela loja",
  "Entregue ao cliente",
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
  od_dnp?: string | null;
  oe_dnp?: string | null;
  od_altura?: string | null;
  oe_altura?: string | null;
  od_prisma?: string | null;
  od_base?: string | null;
  oe_prisma?: string | null;
  oe_base?: string | null;
  av_od?: string | null;
  av_oe?: string | null;
  medico_nome?: string | null;
  medico_crm?: string | null;
  data_receita?: string | null;
  tipo_lente?: string | null;
  observacoes_medico?: string | null;
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
  /** @deprecated mover para tabela prescriptions */
  prescription?: Prescription | null;
  /** @deprecated campo legado */
  delivery_prediction?: string | null;
  lab_status: LabStatus | string | null;
  lab_name: string | null;
  lab_order_number: string | null;
  bairro: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  last_exam_date: string | null;
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
  full_name: string | null;
  email: string | null;
  whatsapp?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  /** @deprecated usar full_name */
  name?: string | null;
  /** @deprecated coluna inexistente, mantida apenas para compat */
  company_id?: string | null;
}

const REMEMBER_KEY = "od.auth.remember";

/**
 * Mantido por compatibilidade. O client oficial (Lovable Cloud) usa
 * localStorage por padrão; aqui apenas registramos a preferência do usuário.
 */
export function setRememberSession(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
  } catch {
    /* ignore */
  }
}
