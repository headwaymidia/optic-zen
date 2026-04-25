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

export const FOLLOW_UP_DEFS: FollowUpDef[] = [
  {
    level: 1,
    label: "Follow-up 1",
    hint: "Lembrete gentil",
    buildScript: (n) =>
      `Oi ${n}, tudo bem? 😊 Passando aqui só pra retomar nossa conversa sobre o seu interesse na ótica. Conseguiu pensar a respeito? Estou à disposição pra te ajudar!`,
  },
  {
    level: 2,
    label: "Follow-up 2",
    hint: "Tirar dúvidas técnicas",
    buildScript: (n) =>
      `Olá ${n}! Aproveitando o contato — ficou alguma dúvida sobre as opções de lentes (antirreflexo, multifocal, transitions) ou sobre as armações que conversamos? Posso te orientar com calma pra você escolher o melhor pro seu dia a dia.`,
  },
  {
    level: 3,
    label: "Follow-up 3",
    hint: "Proposta de valor / benefício exclusivo",
    buildScript: (n) =>
      `${n}, separei uma condição especial pra você: consigo segurar um desconto exclusivo + parcelamento facilitado se você fechar o seu óculos esta semana. Topa eu te enviar a proposta certinha?`,
  },
  {
    level: 4,
    label: "Follow-up 4",
    hint: "Prova social / depoimento",
    buildScript: (n) =>
      `Oi ${n}! Acabou de sair mais uma cliente daqui super feliz com o óculos novo 😍 Recebemos esse tipo de feedback toda semana — qualidade da lente, atendimento e garantia fazem diferença. Quer que eu reserve um horário pra você vir experimentar?`,
  },
  {
    level: 5,
    label: "Follow-up 5 — Última tentativa",
    hint: "Despedida educada (check-out)",
    buildScript: (n) =>
      `${n}, esse é meu último contato pra não te encher 🙏 Vou encerrar seu atendimento por enquanto, mas a ótica continua à sua disposição. Quando precisar de exame, óculos ou lente de contato, é só chamar aqui que te atendo na hora. Um abraço!`,
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
