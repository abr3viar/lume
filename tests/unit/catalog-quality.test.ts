import { describe, expect, it } from "vitest";
import { agentById, agents, skills } from "@/data/catalog";
import { catalogQualityIssues } from "@/data/catalog/quality";
import { AGENT_TRIGGERS } from "@/data/catalog/triggers";
import { agentFile, baseKitInput } from "@/lib/kit/build";
import { parseFrontmatter } from "@/lib/kit/frontmatter";
import { saasExisting } from "./fixtures";

describe("qualidade do catálogo", () => {
  it("o catálogo atual passa em todas as regras", () => {
    expect(catalogQualityIssues(agents, skills)).toEqual([]);
  });

  it("reprova descrição vaga, curta ou sem gatilho", () => {
    const base = agentById.get("suporte-cliente")!;
    const bad = [
      { ...base, whenToUse: "Ajuda o time com várias coisas do suporte em geral, sempre que for preciso." },
      { ...base, id: "x", whenToUse: "Use para suporte." },
    ];
    const issues = catalogQualityIssues(bad, []).join("\n");
    expect(issues).toContain('deve começar com "Use quando');
    expect(issues).toContain("vaga");
    expect(issues).toContain("curta demais");
    expect(issues).toContain("pelo menos 3 exemplos de pedido");
  });

  it("reprova agente só leitura com Edit/Write ou com Bash sem plan", () => {
    const base = agentById.get("revisor-codigo")!;
    const issues = catalogQualityIssues(
      [
        { ...base, tools: ["Read", "Edit"], permissionMode: undefined },
        { ...base, permissionMode: undefined },
        { ...agentById.get("gerador-testes")!, permissionMode: "plan" },
      ],
      [],
    ).join("\n");
    expect(issues).toContain("é só leitura mas tem Edit");
    expect(issues).toContain('precisa de permissionMode "plan"');
    expect(issues).toContain('"plan" só para agentes de leitura');
  });

  it("agentes de revisão e análise são só leitura", () => {
    for (const id of ["revisor-codigo", "seguranca-owasp", "churn-retencao", "metricas-saas", "pesquisa-concorrentes"]) {
      const a = agentById.get(id)!;
      expect(a.access, id).toBe("leitura");
      expect(a.tools, id).not.toContain("Edit");
      expect(a.tools, id).not.toContain("Write");
    }
  });

  it("todo agente tem de 3 a 4 exemplos de pedido", () => {
    for (const a of agents) expect(AGENT_TRIGGERS[a.id]?.length, a.id).toBeGreaterThanOrEqual(3);
  });
});

describe("frontmatter gerado", () => {
  it("leva permissionMode: plan e os exemplos de pedido", () => {
    const input = baseKitInput("existente", saasExisting, { agents: ["revisor-codigo", "gerador-testes"], skills: [], mcps: [] });
    const [rev, gen] = input.agents.map(agentFile);
    const r = parseFrontmatter(rev.content)!;
    expect(r.data.permissionMode).toBe("plan");
    expect(r.data.tools).toBe("Read, Grep, Glob, Bash");
    expect(r.data.description).toContain('Exemplos de pedido: "revise este PR"');
    expect(parseFrontmatter(gen.content)!.data.permissionMode).toBeUndefined();
  });

  it("mantém os exemplos mesmo quando a IA reescreve a descrição", () => {
    const input = baseKitInput("existente", saasExisting, { agents: ["triagem-bugs"], skills: [], mcps: [] });
    input.agents[0].description = "Use quando a agenda da clínica der erro ao salvar consultas.";
    const d = parseFrontmatter(agentFile(input.agents[0]).content)!.data.description;
    expect(d).toContain("agenda da clínica");
    expect(d).toContain('"investigue este erro"');
  });
});
