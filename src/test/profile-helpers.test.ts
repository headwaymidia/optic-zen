import { describe, it, expect } from "vitest";
import { getUserInitials, translateRole } from "@/lib/profile-helpers";

describe("getUserInitials", () => {
  it("usa primeiras letras de dois nomes", () => {
    expect(getUserInitials("Felipe José")).toBe("FJ");
  });

  it("usa duas primeiras letras quando há um único nome", () => {
    expect(getUserInitials("Maria")).toBe("MA");
  });

  it("retorna '??' quando vazio e sem fallback", () => {
    expect(getUserInitials("")).toBe("??");
  });
});

describe("translateRole", () => {
  it("traduz roles em inglês", () => {
    expect(translateRole("owner")).toBe("Proprietário");
    expect(translateRole("manager")).toBe("Gerente");
    expect(translateRole("attendant")).toBe("Atendente");
  });

  it("traduz roles em português", () => {
    expect(translateRole("Dono")).toBe("Proprietário");
  });

  it("retorna o próprio valor quando desconhecido", () => {
    expect(translateRole("unknown")).toBe("unknown");
  });
});
