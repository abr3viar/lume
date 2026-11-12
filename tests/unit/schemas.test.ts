import { describe, expect, it } from "vitest";
import { recommendRequestSchema, sanitizeText, saasInfoSchemaFor, MAX_FIELD } from "@/lib/schemas";

const minimal = { name: "Meu SaaS", description: "Uma descrição com mais de dez caracteres.", model: "B2C" };

describe("saasInfoSchemaFor", () => {
  it("no modo do zero aceita só nome, descrição e modelo", () => {
    const res = saasInfoSchemaFor("zero").safeParse(minimal);
    expect(res.success).toBe(true);
  });

  it("no modo projeto existente exige nicho, problema, estágio e nível técnico, com mensagens em português", () => {
    const res = saasInfoSchemaFor("existente").safeParse(minimal);
    expect(res.success).toBe(false);
    const paths = res.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["niche", "problem", "stage", "techLevel"]));
    expect(res.error!.issues.find((i) => i.path[0] === "stage")!.message).toBe("Escolha o estágio do seu SaaS.");
  });

  it("exige o modelo de negócio com mensagem amigável", () => {
    const res = saasInfoSchemaFor("zero").safeParse({ ...minimal, model: undefined });
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe("Escolha o modelo do seu SaaS.");
  });

  it("limita cada campo a 2000 caracteres", () => {
    const res = saasInfoSchemaFor("zero").safeParse({ ...minimal, description: "a".repeat(MAX_FIELD + 1) });
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toContain("2000");
  });

  it("valida o nome curto demais", () => {
    const res = saasInfoSchemaFor("zero").safeParse({ ...minimal, name: " a " });
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe("O nome precisa ter pelo menos 2 caracteres.");
  });
});

describe("sanitizeText", () => {
  it("remove caracteres de controle e de direção, mantendo quebras de linha", () => {
    expect(sanitizeText("  oi\u0000‮mundo\r\nlinha 2  ")).toBe("oimundo\nlinha 2");
  });
});

describe("recommendRequestSchema", () => {
  it("aplica padrões para tipos e exclusões", () => {
    const res = recommendRequestSchema.parse({ mode: "zero", saas: minimal });
    expect(res.kinds).toEqual(["agent", "skill", "mcp"]);
    expect(res.excludeIds).toEqual({ agent: [], skill: [], mcp: [] });
    expect(res.more).toBe(false);
  });

  it("recusa tipos desconhecidos", () => {
    expect(recommendRequestSchema.safeParse({ mode: "zero", saas: minimal, kinds: ["plugin"] }).success).toBe(false);
  });
});
