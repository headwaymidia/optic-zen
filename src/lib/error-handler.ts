/**
 * Traduz erros técnicos (Postgres, Supabase, rede) para mensagens
 * amigáveis em português que podem ser exibidas ao usuário final.
 */
export function humanizeError(error: unknown): string {
  if (!error) return "Ocorreu um erro inesperado. Tente novamente.";

  const raw =
    typeof error === "string"
      ? error
      : (error as { message?: string; error_description?: string; msg?: string })?.message ??
        (error as { error_description?: string })?.error_description ??
        (error as { msg?: string })?.msg ??
        "";

  const msg = String(raw).toLowerCase();

  if (!msg) return "Ocorreu um erro inesperado. Tente novamente.";

  if (msg.includes("violates row-level security") || msg.includes("row-level security")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (msg.includes("duplicate key value") || msg.includes("already exists") || msg.includes("unique constraint")) {
    return "Este registro já existe.";
  }
  if (msg.includes("violates foreign key constraint") || msg.includes("foreign key")) {
    return "Não é possível remover este item pois ele está vinculado a outros dados.";
  }
  if (msg.includes("column") && msg.includes("does not exist")) {
    return "Erro de configuração. Contate o suporte.";
  }
  if (msg.includes("relation") && msg.includes("does not exist")) {
    return "Erro de configuração. Contate o suporte.";
  }
  if (msg.includes("invalid input syntax")) {
    return "Valor inválido. Verifique os dados e tente novamente.";
  }
  if (msg.includes("jwt expired") || msg.includes("jwt is expired")) {
    return "Sua sessão expirou. Faça login novamente.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar.";
  }
  if (msg.includes("user already registered")) {
    return "Este email já está cadastrado.";
  }
  if (msg.includes("password should be") || msg.includes("password is too short")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("fetch")) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }
  if (msg.includes("not authenticated") || msg.includes("not logged in")) {
    return "Você precisa estar logado para realizar esta ação.";
  }
  if (msg.includes("permission denied")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (msg.includes("timeout")) {
    return "A operação demorou demais. Tente novamente.";
  }

  return "Ocorreu um erro inesperado. Tente novamente.";
}
