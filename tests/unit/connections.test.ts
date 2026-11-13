import { describe, expect, it } from "vitest";
import { baseKitInput, buildKitFiles } from "@/lib/kit/build";
import { connectionsFor, CONNECT_STEP, detectServices } from "@/lib/kit/connections";
import { saasExisting } from "./fixtures";

const NOW = new Date("2026-11-12T12:00:00Z");
const saas = { ...saasExisting, stack: ["Next.js", "Vercel"], description: "Agenda para clínicas. O código está no GitHub e cobramos com Stripe." };

describe("conexões com as ferramentas do projeto", () => {
  it("detecta os serviços citados pela pessoa", () => {
    expect(detectServices(saas).map((m) => m.id).sort()).toEqual(["github", "stripe", "vercel"]);
    expect(detectServices({ ...saasExisting, stack: [], description: "Um aplicativo de receitas." })).toEqual([]);
  });

  it("junta os MCPs do kit com os citados, sem repetir", () => {
    const input = baseKitInput("existente", saas, { agents: [], skills: [], mcps: ["github"] }, NOW);
    const c = connectionsFor(saas, input.mcps);
    expect(c.map((x) => [x.mcp.id, x.inKit])).toEqual([
      ["github", true],
      ["vercel", false],
      ["stripe", false],
    ]);
  });

  it("o kit manda a IA perguntar se quer conectar, em qualquer ferramenta", () => {
    for (const target of ["claude-code", "codex", "outra"] as const) {
      const input = baseKitInput("existente", saas, { agents: [], skills: [], mcps: ["github"] }, NOW);
      input.target = target;
      const fs = buildKitFiles(input);
      const instr = fs.find((f) => f.path === (target === "claude-code" ? "CLAUDE.md" : "AGENTS.md"))!.content;
      expect(instr).toContain("## Conexões com as ferramentas do projeto");
      expect(instr).toContain("Vercel");
      expect(instr).toContain("Nunca peça token");
      const prompt = fs.find((f) => f.path === "PROMPT-DE-ATIVACAO.md")!.content;
      expect(prompt).toContain(target === "claude-code" ? CONNECT_STEP : "Conexões com as ferramentas do projeto");
    }
  });

  it("sem serviços nem MCPs de conta, não aparece a seção", () => {
    const plain = { ...saasExisting, stack: [], description: "Um aplicativo de receitas para casa." };
    const fs = buildKitFiles(baseKitInput("existente", plain, { agents: [], skills: [], mcps: [] }, NOW));
    expect(fs.find((f) => f.path === "CLAUDE.md")!.content).not.toContain("## Conexões");
  });
});
