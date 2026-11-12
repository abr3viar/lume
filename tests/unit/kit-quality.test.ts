import { describe, expect, it } from "vitest";
import { agents, isCodeAgent } from "@/data/catalog";
import { activationPrompt, baseKitInput, claudeMd, TO_FILL } from "@/lib/kit/build";
import { detectStacks } from "@/lib/kit/stacks";
import { saasInfoSchema, type Mode } from "@/lib/schemas";

const NOW = new Date("2026-11-12T12:00:00Z");
const saas = saasInfoSchema.parse({
  name: "Agenda Clínica",
  description: "Agenda online para clínicas.",
  model: "B2B",
  stack: ["Next.js", "Supabase"],
  task: "Ao salvar um agendamento dá erro 500 na página.",
});
const ids = { agents: ["suporte-cliente"], skills: [], mcps: [] };

describe("verificação por evidência nos agentes", () => {
  it("todo agente tem a seção de verificação antes da conclusão", () => {
    for (const a of agents) {
      const p = a.systemPrompt;
      expect(p, a.id).toContain("# Verificação antes de concluir");
      expect(p.indexOf("# Verificação antes de concluir"), a.id).toBeLessThan(p.indexOf("# Critério de conclusão"));
    }
  });

  it("agentes de código exigem rodar testes, lint, typecheck e build e mostrar a saída", () => {
    const code = agents.filter(isCodeAgent);
    expect(code.length).toBeGreaterThan(10);
    for (const a of code) {
      expect(a.systemPrompt, a.id).toContain("Rode os testes, o linter, o typecheck e o build");
      expect(a.systemPrompt, a.id).toContain("Mostre a saída");
      expect(a.systemPrompt, a.id).toContain("Nunca desligue, pule ou apague testes");
    }
    const business = agents.find((a) => a.id === "pesquisa-concorrentes")!;
    expect(business.systemPrompt).toContain("Confira cada número, nome e afirmação contra a fonte");
  });
});

describe("CLAUDE.md mais forte", () => {
  const modes: Mode[] = ["existente", "zero", "erro", "ajuste"];
  for (const mode of modes) {
    it(`modo ${mode}: comandos, convenções, decisões, o que não fazer e verificação`, () => {
      const md = claudeMd(baseKitInput(mode, saas, ids, NOW));
      for (const h of ["## Comandos do projeto", "## Convenções de código", "## Decisões de arquitetura", "## O que NÃO fazer", "## Verificação antes de dizer que terminou"]) {
        expect(md, h).toContain(h);
      }
      expect(md).toContain("git push --force");
      expect(md).toContain("Não desligar, pular ou apagar testes");
    });
  }

  it("não inventa comandos: a tabela fica marcada para o Claude preencher lendo o projeto", () => {
    const md = claudeMd(baseKitInput("existente", saas, ids, NOW));
    const table = md.slice(md.indexOf("## Comandos do projeto"), md.indexOf("## Convenções de código"));
    expect(table).toContain(`| Testes | _${TO_FILL}_ |`);
    expect(table).toContain("`package.json` (seção `scripts`)");
    expect(table).not.toMatch(/npm run|pnpm|yarn|pytest|composer/);
  });

  it("convenções vêm da stack informada", () => {
    const md = claudeMd(baseKitInput("existente", saas, ids, NOW));
    expect(md).toContain("JavaScript/TypeScript");
    expect(md).toContain("evite `any`");
    const py = claudeMd(baseKitInput("existente", { ...saas, stack: ["Django"] }, ids, NOW));
    expect(py).toContain("PEP 8");
    expect(py).not.toContain("evite `any`");
  });

  it("sem stack conhecida, pede para observar o código em vez de chutar", () => {
    const md = claudeMd(baseKitInput("existente", { ...saas, stack: [], description: "Agenda" }, ids, NOW));
    expect(md).toContain("observando o código existente");
  });
});

describe("detecção de stack", () => {
  it("não confunde palavras comuns em português", () => {
    const stack = (description: string) => detectStacks({ stack: [], description, details: "" }).map((s) => s.id);
    expect(stack("Envio de convite para o cadastro, com expressão de interesse e próximo passo")).toEqual([]);
    expect(stack("Feito em Next.js com Node")).toEqual(["node-ts"]);
    expect(stack("Backend em Django e app em Flutter")).toEqual(["python", "dart-flutter"]);
  });
});

describe("prompt de ativação", () => {
  it("projeto existente: propõe as seções do CLAUDE.md e só grava após aprovação", () => {
    const p = activationPrompt(baseKitInput("existente", saas, ids, NOW));
    expect(p).toContain("só grave depois da minha aprovação");
    expect(p).toContain("package.json");
    const nums = [...p.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
    expect(nums).toEqual(nums.map((_, i) => i + 1));
  });

  it("erro e ajuste: descobrir comandos e mostrar o resultado da verificação", () => {
    for (const mode of ["erro", "ajuste"] as const) {
      const p = activationPrompt(baseKitInput(mode, saas, ids, NOW));
      expect(p, mode).toContain("Comandos do projeto");
      expect(p.toLowerCase(), mode).toContain("me mostre o resultado");
    }
  });
});
