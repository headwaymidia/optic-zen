import { describe, it, expect } from "vitest";
import { humanizeError } from "@/lib/error-handler";

describe("humanizeError", () => {
  it("retorna mensagem genérica para erro vazio/null", () => {
    expect(humanizeError(null)).toBe("Ocorreu um erro inesperado. Tente novamente.");
    expect(humanizeError(undefined)).toBe("Ocorreu um erro inesperado. Tente novamente.");
  });

  it("traduz violação de RLS", () => {
    expect(humanizeError({ message: "new row violates row-level security policy" }))
      .toBe("Você não tem permissão para realizar esta ação.");
  });

  it("traduz duplicate key", () => {
    expect(humanizeError({ message: "duplicate key value violates unique constraint" }))
      .toBe("Este registro já existe.");
  });

  it("traduz foreign key", () => {
    expect(humanizeError({ message: "violates foreign key constraint" }))
      .toBe("Não é possível remover este item pois ele está vinculado a outros dados.");
  });

  it("traduz JWT expirado", () => {
    expect(humanizeError({ message: "JWT expired" }))
      .toBe("Sua sessão expirou. Faça login novamente.");
  });

  it("traduz credenciais inválidas", () => {
    expect(humanizeError({ message: "Invalid login credentials" }))
      .toBe("Email ou senha incorretos.");
  });

  it("traduz email já cadastrado", () => {
    expect(humanizeError({ message: "User already registered" }))
      .toBe("Este email já está cadastrado.");
  });

  it("traduz erro de rede", () => {
    expect(humanizeError({ message: "Failed to fetch" }))
      .toBe("Erro de conexão. Verifique sua internet e tente novamente.");
  });

  it("traduz timeout", () => {
    expect(humanizeError({ message: "request timeout" }))
      .toBe("A operação demorou demais. Tente novamente.");
  });

  it("retorna mensagem genérica para erro desconhecido", () => {
    expect(humanizeError({ message: "alguma coisa muito estranha xyz" }))
      .toBe("Ocorreu um erro inesperado. Tente novamente.");
  });

  it("aceita string como input", () => {
    expect(humanizeError("permission denied"))
      .toBe("Você não tem permissão para realizar esta ação.");
  });
});
