import { describe, expect, it } from "vitest";
import { CATALOG_VERSION, LUME_VERSION } from "@/config/version";
import { agents, mcps, skills } from "@/data/catalog";
import { baseKitInput, buildKitFiles, METADATA_FILE } from "@/lib/kit/build";
import { findSecrets } from "@/lib/kit/secrets";
import { isSafeZipPath } from "@/lib/slug";
import { saasInfoSchema, type Mode } from "@/lib/schemas";
import { itemOrigins } from "@/store/kit-store";
import pkg from "../../package.json";

const saas = saasInfoSchema.parse({
  name: "Agenda Clínica",
  description: "Agenda online para clínicas, feita em Next.js.",
  model: "B2B",
  stack: ["Next.js"],
  task: "Ao salvar um agendamento dá erro 500 na página.",
});

/** Gerador pseudoaleatório com semente fixa: os casos são sempre os mesmos. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const sample = <T,>(arr: T[], n: number, r: () => number) => [...arr].sort(() => r() - 0.5).slice(0, n);

describe("consistência do kit ao remover itens", () => {
  const modes: Mode[] = ["existente", "zero", "erro", "ajuste"];
  const r = rng(42);
  for (let i = 0; i < 40; i++) {
    const mode = modes[i % 4];
    const ids = {
      agents: sample(agents, Math.floor(r() * 8), r).map((a) => a.id),
      skills: sample(skills, Math.floor(r() * 5), r).map((s) => s.id),
      mcps: sample(mcps, Math.floor(r() * 4), r).map((m) => m.id),
    };
    it(`caso ${i + 1} (${mode}, ${ids.agents.length}/${ids.skills.length}/${ids.mcps.length}): nada cita item ausente`, () => {
      const files = buildKitFiles(baseKitInput(mode, saas, ids));
      const absentAgents = agents.map((a) => a.id).filter((id) => !ids.agents.includes(id));
      const absentSkills = skills.map((s) => s.id).filter((id) => !ids.skills.includes(id));
      for (const f of files) {
        expect(isSafeZipPath(f.path), f.path).toBe(true);
        expect(findSecrets(f.content), f.path).toEqual([]);
        for (const id of absentAgents) {
          for (const ref of [`\`${id}\``, `.claude/agents/${id}.md`, `agente ${id}`]) {
            expect(f.content.includes(ref), `${f.path} cita o agente ausente ${ref}`).toBe(false);
          }
        }
        for (const id of absentSkills) {
          for (const ref of [`\`${id}\``, `.claude/skills/${id}/`, `skill ${id} `, `\`/${id}\``]) {
            expect(f.content.includes(ref), `${f.path} cita a skill ausente ${ref}`).toBe(false);
          }
        }
      }
      // .mcp.json só com os MCPs escolhidos.
      const mcpFile = files.find((f) => f.path === ".mcp.json");
      if (ids.mcps.length) expect(Object.keys(JSON.parse(mcpFile!.content).mcpServers).sort()).toEqual([...ids.mcps].sort());
      else expect(mcpFile).toBeUndefined();
    });
  }
});

describe("metadados do kit", () => {
  it("lume-kit.json traz versões, data, modo e origem de cada item", () => {
    const ids = { agents: ["suporte-cliente", "revisor-codigo"], skills: ["checklist-lgpd"], mcps: ["github"] };
    const input = baseKitInput("existente", saas, ids, new Date("2026-11-12T12:00:00Z"));
    input.aiProvider = "claude-code";
    input.origins = itemOrigins(
      { agent: ids.agents, skill: ids.skills, mcp: ids.mcps },
      { agent: [{ id: "suporte-cliente", reason: "Motivo concreto do SaaS.", impact: "alto", kind: "agent" }], skill: [], mcp: [] },
      "ia",
    );
    const files = buildKitFiles(input);
    const meta = JSON.parse(files.find((f) => f.path === METADATA_FILE)!.content);
    expect(meta.versaoLume).toBe(LUME_VERSION);
    expect(meta.versaoLume).toBe(pkg.version);
    expect(meta.catalogo).toEqual({ versao: CATALOG_VERSION, agentes: agents.length, skills: skills.length, mcps: mcps.length });
    expect(meta.geradoEm).toBe("2026-11-12T12:00:00.000Z");
    expect(meta.tipoDeKit).toBe("existente");
    expect(meta.ia).toBe("claude-code");
    expect(meta.itens).toEqual([
      { tipo: "agente", id: "suporte-cliente", origem: "ia", personalizado: false },
      { tipo: "agente", id: "revisor-codigo", origem: "catalogo", personalizado: false },
      { tipo: "skill", id: "checklist-lgpd", origem: "catalogo", personalizado: false },
      { tipo: "mcp", id: "github", origem: "catalogo", verificadoEm: "2026-11-12" },
    ]);
    // Aparece na árvore do LEIA-ME.
    expect(files.find((f) => f.path === "LEIA-ME.md")!.content).toContain(METADATA_FILE);
  });

  it("origem 'recomendador' quando as sugestões vieram do modo sem IA", () => {
    const o = itemOrigins(
      { agent: ["suporte-cliente"], skill: [], mcp: [] },
      { agent: [{ id: "suporte-cliente", reason: "Motivo concreto do SaaS.", impact: "médio", kind: "agent" }], skill: [], mcp: [] },
      "local",
    );
    expect(o).toEqual({ "agent:suporte-cliente": "recomendador" });
  });
});
