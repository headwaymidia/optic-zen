/**
 * Helpers de exibição do perfil do usuário.
 */

export function getUserInitials(fullName?: string | null, fallback?: string | null): string {
  const name = (fullName ?? "").trim();
  if (name) {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return words[0].slice(0, 2).toUpperCase();
  }
  const fb = (fallback ?? "").trim();
  if (!fb) return "U";
  const parts = fb.split(/[\s@.]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return ((first + second) || fb[0]).toUpperCase();
}

export function translateRole(role?: string | null): string {
  if (!role) return "";
  const map: Record<string, string> = {
    owner: "Proprietário",
    dono: "Proprietário",
    proprietário: "Proprietário",
    proprietario: "Proprietário",
    manager: "Gerente",
    gerente: "Gerente",
    attendant: "Atendente",
    atendente: "Atendente",
  };
  return map[role.toLowerCase()] ?? role;
}
