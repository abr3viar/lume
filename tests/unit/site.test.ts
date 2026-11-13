import { describe, expect, it } from "vitest";
import { baseKitInput, buildKitFiles } from "@/lib/kit/build";
import { localRecommendations } from "@/lib/recommend-local";
import { saasInfoSchema, saasInfoSchemaFor } from "@/lib/schemas";

const NOW = new Date("2026-11-12T12:00:00Z");
const site = saasInfoSchema.parse({
  kind: "site",
  name: "Pizzaria do Bairro",
  description: "Site de uma pizzaria de bairro com cardápio, horários, mapa e pedido pelo WhatsApp.",
});

describe("site comum", () => {
  it("não exige modelo de negócio, mas o SaaS continua exigindo", () => {
    expect(saasInfoSchemaFor("existente").safeParse(site).success).toBe(true);
    expect(saasInfoSchemaFor("existente").safeParse({ ...site, kind: "saas" }).success).toBe(false);
  });

  it("o recomendador prioriza conteúdo, SEO e performance e deixa de fora itens de assinatura", () => {
    const recs = localRecommendations({ mode: "existente", saas: site, kinds: ["agent", "skill", "mcp"], more: false, excludeIds: { agent: [], skill: [], mcp: [] } } as never);
    const ids = recs.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["copy-landing-page", "seo-conteudo"]));
    for (const saasOnly of ["churn-retencao", "cobranca-inadimplencia", "metricas-saas"]) expect(ids).not.toContain(saasOnly);
  });

  it("o kit fala de site, não de SaaS, e não tem a linha de modelo", () => {
    for (const target of ["claude-code", "codex"] as const) {
      const input = baseKitInput("existente", site, { agents: ["copy-landing-page"], skills: [], mcps: [] }, NOW);
      input.target = target;
      const fs = buildKitFiles(input);
      for (const p of [target === "claude-code" ? "CLAUDE.md" : "AGENTS.md", "PROMPT-DE-ATIVACAO.md", "LEIA-ME.md"]) {
        const c = fs.find((f) => f.path === p)!.content;
        expect(c, p).not.toMatch(/\bSaaS\b/);
      }
      const instr = fs.find((f) => f.path === (target === "claude-code" ? "CLAUDE.md" : "AGENTS.md"))!.content;
      expect(instr).toContain("Contexto do site");
      expect(instr).not.toContain("| **Modelo** |");
    }
  });
});
