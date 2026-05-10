import { describe, it, expect } from "vitest";
import {
  validatePhoneBR,
  validateCPF,
  validateCEP,
  validateEmail,
} from "@/lib/validators";

describe("validatePhoneBR", () => {
  it("aceita telefone válido com 11 dígitos", () => {
    expect(validatePhoneBR("(11) 91234-5678")).toBeNull();
    expect(validatePhoneBR("11912345678")).toBeNull();
  });

  it("aceita telefone válido com 10 dígitos", () => {
    expect(validatePhoneBR("(11) 1234-5678")).toBeNull();
  });

  it("rejeita telefone com quantidade de dígitos errada", () => {
    expect(validatePhoneBR("12345")).not.toBeNull();
    expect(validatePhoneBR("123456789012")).not.toBeNull();
  });

  it("exige telefone quando required=true", () => {
    expect(validatePhoneBR("")).not.toBeNull();
  });

  it("aceita telefone vazio quando required=false", () => {
    expect(validatePhoneBR("", false)).toBeNull();
  });
});

describe("validateCPF", () => {
  it("aceita CPF válido", () => {
    expect(validateCPF("529.982.247-25")).toBeNull();
    expect(validateCPF("52998224725")).toBeNull();
  });

  it("rejeita CPF com tamanho errado", () => {
    expect(validateCPF("123")).not.toBeNull();
  });

  it("rejeita CPF com todos dígitos iguais", () => {
    expect(validateCPF("11111111111")).not.toBeNull();
  });

  it("rejeita CPF com dígitos verificadores inválidos", () => {
    expect(validateCPF("12345678900")).not.toBeNull();
  });

  it("aceita CPF vazio (opcional)", () => {
    expect(validateCPF("")).toBeNull();
  });
});

describe("validateCEP", () => {
  it("aceita CEP válido com máscara", () => {
    expect(validateCEP("01310-100")).toBeNull();
  });

  it("aceita CEP válido só com dígitos", () => {
    expect(validateCEP("01310100")).toBeNull();
  });

  it("rejeita CEP com tamanho errado", () => {
    expect(validateCEP("123")).not.toBeNull();
  });

  it("aceita CEP vazio (opcional)", () => {
    expect(validateCEP("")).toBeNull();
  });
});

describe("validateEmail", () => {
  it("aceita email válido", () => {
    expect(validateEmail("user@example.com")).toBeNull();
    expect(validateEmail("a.b+c@sub.example.co")).toBeNull();
  });

  it("rejeita email inválido", () => {
    expect(validateEmail("not-an-email")).not.toBeNull();
    expect(validateEmail("user@")).not.toBeNull();
    expect(validateEmail("@example.com")).not.toBeNull();
  });

  it("rejeita email vazio", () => {
    expect(validateEmail("")).not.toBeNull();
  });
});
