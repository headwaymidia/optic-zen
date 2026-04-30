// Cadência de Vendas — 5 tentativas
// Cada nível tem um copywriting específico para a vendedora editar antes de enviar.

export const FOLLOW_UP_INTERVAL_HOURS = 8;
export const MAX_FOLLOW_UPS = 5;

export type FollowUpLevel = 1 | 2 | 3 | 4 | 5;

interface FollowUpDef {
  level: FollowUpLevel;
  label: string;
  hint: string;
  buildScript: (firstName: string) => string;
}

// Copy padrão única para todos os níveis da cadência.
// Variável {nome_do_cliente} é substituída pelo PRIMEIRO NOME do lead.
const STANDARD_FOLLOW_UP = (firstName: string) =>
  `Oi ${firstName}, tudo bem? sei que esta corrido por ai, mas queria entender se você já fez seu óculos? já possui receita?`;

export const FOLLOW_UP_DEFS: FollowUpDef[] = [
  {
    level: 1,
    label: "Follow-up 1",
    hint: "Lembrete gentil",
    buildScript: STANDARD_FOLLOW_UP,
  },
  {
    level: 2,
    label: "Follow-up 2",
    hint: "Reforço",
    buildScript: STANDARD_FOLLOW_UP,
  },
  {
    level: 3,
    label: "Follow-up 3",
    hint: "Reengajamento",
    buildScript: STANDARD_FOLLOW_UP,
  },
  {
    level: 4,
    label: "Follow-up 4",
    hint: "Última chance",
    buildScript: STANDARD_FOLLOW_UP,
  },
  {
    level: 5,
    label: "Follow-up 5 — Última tentativa",
    hint: "Despedida educada",
    buildScript: STANDARD_FOLLOW_UP,
  },
];

export function getFollowUpDef(level: number): FollowUpDef | null {
  if (level < 1 || level > MAX_FOLLOW_UPS) return null;
  return FOLLOW_UP_DEFS[level - 1] ?? null;
}

/**
 * Calcula qual é o próximo follow-up a ser enviado para o lead, considerando
 * follow_up_count atual e se já passaram FOLLOW_UP_INTERVAL_HOURS desde o último envio.
 * Retorna null se o lead não está pendente (ainda dentro da janela ou já estourou os 5).
 */
export function getPendingFollowUpLevel(
  followUpCount: number,
  lastFollowUpAt: string | null,
  fallbackTimestamp: string | null
): FollowUpLevel | null {
  if (followUpCount >= MAX_FOLLOW_UPS) return null;
  const ref = lastFollowUpAt ?? fallbackTimestamp;
  if (!ref) return (followUpCount + 1) as FollowUpLevel;
  const hours = (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60);
  if (hours < FOLLOW_UP_INTERVAL_HOURS) return null;
  return (followUpCount + 1) as FollowUpLevel;
}
