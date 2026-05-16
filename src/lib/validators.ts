/**
 * Validações nativas em português, sem dependências externas.
 * Cada função retorna `null` quando válido ou uma string com a mensagem de erro.
 */

export function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Nome obrigatório.";
  if (trimmed.length < 2) return "Nome deve ter pelo menos 2 caracteres.";
  return null;
}

export function validatePhoneBR(value: string, required = true): string | null {
  let digits = value.replace(/\D/g, "");
  if (!digits) return required ? "Telefone obrigatório." : null;
  // Aceita DDI internacional do Brasil (+55) → remove se vier com 12 ou 13 dígitos começando com 55
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) {
    return "Telefone deve ter 10 ou 11 dígitos (ou 12-13 com DDI +55).";
  }
  return null;
}

export function validateCPF(value: string): string | null {
  if (!value.trim()) return null; // opcional
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return "CPF deve ter 11 dígitos.";
  if (/^(\d)\1{10}$/.test(digits)) return "CPF inválido.";
  // Cálculo dos dígitos verificadores
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i], 10) * (factor - i);
    }
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(digits.slice(0, 9), 10);
  const d2 = calc(digits.slice(0, 10), 11);
  if (d1 !== parseInt(digits[9], 10) || d2 !== parseInt(digits[10], 10)) {
    return "CPF inválido.";
  }
  return null;
}

export function validateCEP(value: string): string | null {
  if (!value.trim()) return null; // opcional
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return "CEP deve ter 8 dígitos.";
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email obrigatório.";
  // Regex razoável (não 100% RFC, mas suficiente)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Email inválido.";
  }
  return null;
}

export interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export async function fetchAddressByCep(cep: string): Promise<ViaCepResponse | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResponse;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}
