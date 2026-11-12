import { describe, expect, it } from "vitest";
import { agentById } from "@/data/catalog";
import { countsFor } from "@/lib/ai/recommend-core";
import { saasInfoBlock } from "@/lib/ai/prompts";
import { baseKitInput, buildKitFiles, DISCOVERY_MARK, FIX_MARK, QUICK_MARK } from "@/lib/kit/build";
import { localRecommendations } from "@/lib/recommend-local";
import { recommendRequestSchema, saasInfoSchema, saasInfoSchemaFor } from "@/lib/schemas";

const bugSaas = saasInfoSchema.parse({
  name: "Agenda Clínica",
  task: "Ao salvar um agendamento a página dá erro 500 e nada é salvo.",
  details: "1. Entrar em /agenda 2. Clicar em Novo 3. Salvar. Console: TypeError reading 'id'",
  stack: ["Next.js", "Supabase"],
});
const quickSaas = saasInfoSchema.parse({
  name: "Agenda Clínica",
  task: "Trocar o texto do botão de cadastro e adicionar o campo telefone no formulário.",
  stack: ["Next.js"],
});
const NOW = new Date("2026-11-12T12:00:00Z");

describe("validação dos modos de tarefa", () => {
  it("erro e ajuste exigem só o nome e a tarefa", () => {
    expect(saasInfoSchemaFor("erro").safeParse({ name: "Projeto X", task: "Botão não salva nada quando clico." }).success).toBe(true);
    const res = saasInfoSchemaFor("ajuste").safeParse({ name: "Projeto X", task: "curto" });
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe("Descreva a mudança em pelo menos 10 caracteres.");
    expect(saasInfoSchemaFor("erro").safeParse({ name: "Projeto X" }).error!.issues[0].message).toBe(
      "Descreva o erro em pelo menos 10 caracteres.",
    );
  });

  it("os modos de SaaS continuam exigindo descrição e modelo", () => {
    const res = saasInfoSchemaFor("zero").safeParse({ name: "Projeto X" });
    const paths = res.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["description", "model"]));
  });
});

describe("recomendações enxutas", () => {
  it("contagens menores para a IA", () => {
    expect(countsFor({ kinds: ["agent", "skill", "mcp"], more: false, mode: "erro" })).toEqual({ agent: [3, 5], skill: [3, 5], mcp: [2, 3] });
    expect(countsFor({ kinds: ["agent"], more: false, mode: "zero" })).toEqual({ agent: [8, 12] });
  });

  it("modo erro: triagem de bugs e testes na frente, sem agentes de fundação", () => {
    const out = localRecommendations(recommendRequestSchema.parse({ mode: "erro", saas: bugSaas }));
    const agents = out.filter((i) => i.kind === "agent").map((i) => i.id);
    expect(agents).toHaveLength(4);
    expect(agents[0]).toBe("triagem-bugs");
    expect(agents).toContain("gerador-testes");
    for (const id of agents) expect(agentById.get(id)!.foundation).toBe(false);
    expect(out.filter((i) => i.kind === "skill").map((i) => i.id)).toContain("plano-testes");
    expect(out.filter((i) => i.kind === "mcp")).toHaveLength(3);
    expect(out.find((i) => i.id === "triagem-bugs")!.reason).toContain("erro");
  });

  it("modo ajuste: o assunto da mudança puxa o especialista certo", () => {
    const out = localRecommendations(recommendRequestSchema.parse({ mode: "ajuste", saas: quickSaas }));
    const agents = out.filter((i) => i.kind === "agent").map((i) => i.id);
    expect(agents).toContain("revisor-codigo");
    expect(agents).toContain("copy-landing-page"); // "texto do botão"
    expect(agents).toContain("modelagem-dados"); // "campo ... formulário"
    expect(out.filter((i) => i.kind === "skill").map((i) => i.id)).toEqual(expect.arrayContaining(["revisao-pr", "commits-changelog"]));
  });

  it("o bloco enviado à IA traz a tarefa", () => {
    const block = saasInfoBlock(bugSaas, "erro");
    expect(block).toContain("Erro a consertar: Ao salvar um agendamento");
    expect(block).toContain("Como reproduzir");
    expect(saasInfoBlock(quickSaas, "ajuste")).toContain("Mudança pedida");
  });
});

describe("kit dos modos de tarefa", () => {
  const ids = { agents: ["triagem-bugs", "gerador-testes"], skills: ["plano-testes"], mcps: ["sentry"] };

  it("modo erro: Modo Conserto no topo do CLAUDE.md, TAREFA.md e prompt próprio", () => {
    const files = buildKitFiles(baseKitInput("erro", bugSaas, ids, NOW));
    const get = (p: string) => files.find((f) => f.path === p)?.content ?? "";
    const claude = get("CLAUDE.md");
    expect(claude.indexOf(FIX_MARK)).toBeGreaterThan(-1);
    expect(claude.indexOf(FIX_MARK)).toBeLessThan(claude.indexOf("## Contexto do projeto"));
    expect(claude).toContain("Reproduza o erro antes de alterar");
    expect(claude).not.toContain(DISCOVERY_MARK);
    expect(claude).not.toContain("Modelo**");
    const tarefa = get("TAREFA.md");
    expect(tarefa).toContain("Ao salvar um agendamento");
    expect(tarefa).toContain("Existe um teste que falharia se o erro voltasse.");
    expect(get("PROMPT-DE-ATIVACAO.md")).toContain("MODO CONSERTO está ativo");
    expect(get("LEIA-ME.md")).toContain("TAREFA.md");
    expect(files.some((f) => f.path === "BRIEFING.md")).toBe(false);
  });

  it("modo ajuste: Modo Ajuste Rápido, escopo fechado", () => {
    const files = buildKitFiles(baseKitInput("ajuste", quickSaas, ids, NOW));
    const claude = files.find((f) => f.path === "CLAUDE.md")!.content;
    expect(claude).toContain(QUICK_MARK);
    expect(claude).toContain("Mantenha o escopo fechado");
    expect(files.find((f) => f.path === "TAREFA.md")!.content).toContain("_não informado: pergunte ao usuário se precisar_");
    expect(files.find((f) => f.path === "PROMPT-DE-ATIVACAO.md")!.content).toContain("MODO AJUSTE RÁPIDO está ativo");
  });

  it("modos de SaaS não levam TAREFA.md nem os blocos de tarefa", () => {
    const saas = saasInfoSchema.parse({ name: "X Y", description: "Descrição com mais de dez letras", model: "B2C" });
    for (const mode of ["existente", "zero"] as const) {
      const files = buildKitFiles(baseKitInput(mode, saas, ids, NOW));
      expect(files.some((f) => f.path === "TAREFA.md")).toBe(false);
      for (const f of files) {
        expect(f.content).not.toContain(FIX_MARK);
        expect(f.content).not.toContain(QUICK_MARK);
      }
    }
  });
});
