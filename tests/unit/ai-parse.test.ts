import { describe, expect, it } from "vitest";
import { LineBuffer, safeParseJson } from "@/lib/ai/parse";
import { RecommendationFilter } from "@/lib/ai/recommend-core";
import { validateAgentOutput, validateSkillOutput, PersonalizationRejected } from "@/lib/ai/personalize";
import { agentById, skillById } from "@/data/catalog";

describe("safeParseJson", () => {
  it("lê JSON válido", () => {
    expect(safeParseJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("remove cercas de código", () => {
    expect(safeParseJson('```json\n{"a":[1,2]}\n```')).toEqual({ a: [1, 2] });
  });
  it("extrai o primeiro objeto balanceado com texto ao redor", () => {
    expect(safeParseJson('Aqui está: {"id":"x","t":"chave } dentro"} e fim')).toEqual({ id: "x", t: "chave } dentro" });
  });
  it("devolve null para JSON quebrado", () => {
    expect(safeParseJson('{"id": "x", "reason": ')).toBeNull();
    expect(safeParseJson("nada de json")).toBeNull();
    expect(safeParseJson("")).toBeNull();
    expect(safeParseJson('{"a": 1,,}')).toBeNull();
  });
});

describe("LineBuffer", () => {
  it("só entrega linhas completas, mesmo com pedaços quebrados", () => {
    const b = new LineBuffer();
    expect(b.push('{"a":')).toEqual([]);
    expect(b.push('1}\n{"b"')).toEqual(['{"a":1}']);
    expect(b.push(":2}\n\n")).toEqual(['{"b":2}']);
    expect(b.push('{"c":3}')).toEqual([]);
    expect(b.flush()).toEqual(['{"c":3}']);
  });
});

describe("RecommendationFilter", () => {
  const req = { kinds: ["agent", "mcp"] as ("agent" | "mcp")[], more: false, excludeIds: { agent: ["revisor-codigo"], skill: [], mcp: [] } };
  const line = (kind: string, id: string) => JSON.stringify({ kind, id, reason: "Faz sentido para o seu SaaS porque sim.", impact: "alto" });

  it("aceita itens válidos e descarta inexistentes, duplicados, excluídos e tipos não pedidos", () => {
    const f = new RecommendationFilter(req);
    expect(f.acceptLine(line("agent", "suporte-cliente"))?.id).toBe("suporte-cliente");
    expect(f.acceptLine(line("agent", "suporte-cliente"))).toBeNull(); // duplicado
    expect(f.acceptLine(line("agent", "agente-inventado"))).toBeNull(); // inexistente
    expect(f.acceptLine(line("agent", "revisor-codigo"))).toBeNull(); // excluído
    expect(f.acceptLine(line("skill", "escrever-prd"))).toBeNull(); // tipo não pedido
    expect(f.acceptLine(line("mcp", "suporte-cliente"))).toBeNull(); // id de outro tipo
    expect(f.acceptLine("{quebrado")).toBeNull();
    expect(f.acceptLine(JSON.stringify({ kind: "agent", id: "seo-conteudo", reason: "curto", impact: "alto" }))).toBeNull();
    expect(f.total()).toBe(1);
  });

  it("respeita o máximo por tipo e calcula o que falta", () => {
    const f = new RecommendationFilter(req);
    const all = [...agentById.keys()].filter((id) => id !== "revisor-codigo");
    all.slice(0, 20).forEach((id) => f.acceptLine(line("agent", id)));
    expect(f.acceptedIds("agent")).toHaveLength(8);
    expect(f.missing()).toEqual({ mcp: 3 });
  });
});

describe("validação da personalização", () => {
  const agent = agentById.get("suporte-cliente")!;
  it("aceita um prompt que mantém todas as seções", () => {
    const out = validateAgentOutput({ description: "Use para responder tickets da clínica.", prompt: agent.systemPrompt + "\n- extra" }, agent.systemPrompt);
    expect(out.prompt).toContain("# Papel");
  });
  it("rejeita prompt sem seção obrigatória ou encurtado", () => {
    expect(() => validateAgentOutput({ description: "Descrição qualquer válida.", prompt: agent.systemPrompt.replace("# Critério de conclusão", "") }, agent.systemPrompt)).toThrow(PersonalizationRejected);
    expect(() => validateAgentOutput({ description: "Descrição qualquer válida.", prompt: "# Papel\n# Objetivo\n# Passo a passo\n# Formato de saída\n# Regras e limites\n# Critério de conclusão" }, agent.systemPrompt)).toThrow(PersonalizationRejected);
  });
  it("rejeita conteúdo com aparência de segredo", () => {
    expect(() => validateAgentOutput({ description: "x".repeat(30), prompt: agent.systemPrompt + " sk-ant-api03-abcdefghijklmnopqrstuv" }, agent.systemPrompt)).toThrow(PersonalizationRejected);
  });
  it("rejeita skill que perdeu o link do arquivo auxiliar", () => {
    const skill = skillById.get("checklist-lgpd")!;
    expect(() => validateSkillOutput({ description: "d".repeat(50), body: skill.body.replace("(checklist.md)", "") }, skill.body, ["checklist.md"])).toThrow(PersonalizationRejected);
  });
});
