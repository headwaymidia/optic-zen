import { describe, it, expect } from "vitest";
import { LEAD_STATUSES, LEAD_SOURCES, INTEREST_TAGS } from "@/lib/leads-constants";

describe("LEAD_STATUSES", () => {
  it("contém todos os status esperados", () => {
    expect(LEAD_STATUSES).toEqual([
      "Novo Lead",
      "Em Atendimento",
      "Aguardando Resposta",
      "Agendou Exame",
      "Não Compareceu",
      "Compareceu e Comprou",
      "Compareceu e Não Comprou",
      "Repescagem",
    ]);
  });
});

describe("LEAD_SOURCES", () => {
  it("contém todas as origens esperadas", () => {
    expect(LEAD_SOURCES).toEqual([
      "Instagram",
      "Google Ads",
      "WhatsApp",
      "Indicação",
      "Facebook",
      "Loja Física",
      "Outro",
    ]);
  });
});

describe("INTEREST_TAGS", () => {
  it("contém todas as tags esperadas", () => {
    expect(INTEREST_TAGS).toEqual([
      "Exame",
      "Multifocal",
      "Solar",
      "Lentes de Contato",
      "Armação",
      "Infantil",
    ]);
  });
});
