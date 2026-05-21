/**
 * Calcula minutos de diferença entre dois timestamps
 * considerando apenas o horário comercial da loja.
 *
 * Ex: mensagem às 23h, resposta às 8h do dia seguinte
 * Com horário 8h-18h → resultado: ~0min (respondeu logo ao abrir)
 */
export interface BusinessHours {
  start: number; // hora de abertura, ex: 8
  end: number;   // hora de fechamento, ex: 18
  days: number[]; // dias da semana: 0=dom, 1=seg...6=sab
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  start: 8,
  end: 18,
  days: [1, 2, 3, 4, 5, 6], // seg-sab
};

/**
 * Avança um timestamp até o próximo momento dentro do horário comercial.
 */
function nextBusinessMoment(date: Date, bh: BusinessHours): Date {
  const d = new Date(date);

  // Tentar no máximo 7 dias para encontrar o próximo horário comercial
  for (let i = 0; i < 7; i++) {
    const dow = d.getDay(); // 0=dom...6=sab
    const hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;

    if (bh.days.includes(dow)) {
      if (hour < bh.start) {
        // Antes do horário — avança para a abertura
        d.setHours(bh.start, 0, 0, 0);
        return d;
      } else if (hour < bh.end) {
        // Dentro do horário — ok
        return d;
      }
    }

    // Fora do horário ou dia não útil — avança para o próximo dia
    d.setDate(d.getDate() + 1);
    d.setHours(bh.start, 0, 0, 0);
  }

  return d;
}

/**
 * Calcula minutos de diferença entre start e end dentro do horário comercial.
 * Retorna null se não for possível calcular.
 */
export function businessMinutesBetween(
  start: Date,
  end: Date,
  bh: BusinessHours = DEFAULT_BUSINESS_HOURS
): number {
  if (end <= start) return 0;

  let current = nextBusinessMoment(new Date(start), bh);
  const endTime = end.getTime();
  let totalMinutes = 0;
  const msPerDay = 24 * 60 * 60 * 1000;

  // Limite de segurança: máximo 30 dias
  const limit = new Date(start.getTime() + 30 * msPerDay);
  if (end > limit) return (end.getTime() - start.getTime()) / 60000; // fallback

  while (current.getTime() < endTime) {
    const dow = current.getDay();

    if (!bh.days.includes(dow)) {
      // Dia não útil — pular para o próximo dia
      current.setDate(current.getDate() + 1);
      current.setHours(bh.start, 0, 0, 0);
      continue;
    }

    const dayEnd = new Date(current);
    dayEnd.setHours(bh.end, 0, 0, 0);

    if (current.getHours() >= bh.end) {
      // Passou do horário de fechamento — pular para o próximo dia
      current.setDate(current.getDate() + 1);
      current.setHours(bh.start, 0, 0, 0);
      continue;
    }

    // Fim do período a contar neste dia
    const periodEnd = new Date(Math.min(dayEnd.getTime(), endTime));
    totalMinutes += (periodEnd.getTime() - current.getTime()) / 60000;

    if (periodEnd.getTime() >= endTime) break;

    // Avança para o próximo dia útil
    current.setDate(current.getDate() + 1);
    current.setHours(bh.start, 0, 0, 0);
  }

  return Math.max(0, totalMinutes);
}
