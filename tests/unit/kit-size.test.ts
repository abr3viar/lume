import { describe, expect, it } from "vitest";
import { KIT_LIMITS } from "@/config/kit";
import { agents } from "@/data/catalog";
import { essentialMax, RecommendationFilter } from "@/lib/ai/recommend-core";
import { checkCart } from "@/lib/kit/checks";
import { localRecommendations } from "@/lib/recommend-local";
import { recommendRequestSchema } from "@/lib/schemas";
import { cartSummary } from "@/store/kit-store";
import { saasExisting, saasZero } from "./fixtures";

const line = (id: string, impact = "alto") =>
  JSON.stringify({ kind: "agent", id, reason: "Faz sentido para o seu SaaS por um motivo concreto.", impact });

describe("teto do kit e essenciais", () => {
  it("kits completos sugerem de 5 a 8 agentes; kits de tarefa, de 3 a 5", () => {
    expect(KIT_LIMITS.full.range.agent).toEqual([5, 8]);
    expect(KIT_LIMITS.full.range.skill).toEqual([3, 5]);
    expect(KIT_LIMITS.task.range.agent).toEqual([3, 5]);
  });

  it("a IA não passa do teto e essenciais além do limite viram opcionais", () => {
    const f = new RecommendationFilter({ kinds: ["agent"], more: false, mode: "existente", excludeIds: { agent: [], skill: [], mcp: [] } });
    const out = agents.slice(0, 12).map((a) => f.acceptLine(line(a.id))).filter(Boolean);
    expect(out).toHaveLength(8);
    expect(out.filter((i) => i!.impact === "alto")).toHaveLength(KIT_LIMITS.full.essential.agent);
    expect(out[0]!.impact).toBe("alto");
    expect(out[7]!.impact).toBe("médio");
  });

  it("em 'gerar mais' nada é marcado como essencial", () => {
    expect(essentialMax({ more: true, mode: "existente" })).toEqual({ agent: 0, skill: 0, mcp: 0 });
    const f = new RecommendationFilter({ kinds: ["agent"], more: true, mode: "existente", excludeIds: { agent: [], skill: [], mcp: [] } });
    expect(f.acceptLine(line(agents[0].id))!.impact).toBe("médio");
  });

  it("o recomendador local respeita o limite de essenciais em todos os modos", () => {
    for (const [mode, saas] of [["existente", saasExisting], ["zero", saasZero]] as const) {
      const out = localRecommendations(recommendRequestSchema.parse({ mode, saas }));
      const cap = essentialMax({ more: false, mode });
      for (const kind of ["agent", "skill", "mcp"] as const) {
        const ess = out.filter((i) => i.kind === kind && i.impact === "alto");
        expect(ess.length, `${mode} ${kind}`).toBeLessThanOrEqual(cap[kind]);
      }
      expect(out.some((i) => i.impact === "alto"), mode).toBe(true);
    }
  });

  it("o carrinho avisa quando passa do teto, sem bloquear", () => {
    const many = agents.slice(0, 9).map((a) => a.id);
    const out = checkCart({ agents: many, skills: [], mcps: [] }, "B2B");
    expect(out.find((c) => c.id === "muitos-agentes")!.title).toBe("9 agentes é bastante");
    expect(checkCart({ agents: many.slice(0, 8), skills: [], mcps: [] }, "B2B").some((c) => c.id === "muitos-agentes")).toBe(false);
  });

  it("resume o carrinho por tipo", () => {
    expect(cartSummary({ agent: ["a", "b"], skill: ["c"], mcp: [] })).toBe("2 agentes e 1 skill");
    expect(cartSummary({ agent: ["a"], skill: ["b", "c"], mcp: ["d", "e"] })).toBe("1 agente, 2 skills e 2 MCPs");
    expect(cartSummary({ agent: [], skill: [], mcp: [] })).toBe("Nenhum item");
  });
});
