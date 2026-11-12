import { z } from "zod";
import { businessAgents } from "./agents-negocio";
import { technicalAgents } from "./agents-tecnico";
import { mcpsInput } from "./mcps";
import { presetsInput } from "./presets";
import {
  agentSchema,
  mcpSchema,
  presetSchema,
  skillSchema,
  type Agent,
  type ItemKind,
  type Mcp,
  type Preset,
  type Skill,
} from "./schema";
import { skillsInput } from "./skills";

export * from "./schema";
export { discardedMcps } from "./mcps";

/** Categorias cujos agentes mexem em código: a verificação exige rodar as ferramentas do projeto. */
export const CODE_CATEGORIES = ["Engenharia", "Fundação", "Dados", "Operações"];

export function isCodeAgent(agent: Pick<Agent, "category">) {
  return CODE_CATEGORIES.includes(agent.category);
}

/** Verificação por evidência: o agente só conclui depois de mostrar o resultado. */
export function verificationSection(agent: Pick<Agent, "category">): string {
  if (isCodeAgent(agent)) {
    return [
      "Antes de dizer que terminou:",
      "1. Rode os testes, o linter, o typecheck e o build do projeto, usando os comandos da seção \"Comandos do projeto\" do CLAUDE.md (se não houver, descubra no package.json ou equivalente e anote lá).",
      "2. Mostre a saída resumida de cada comando (passou, falhou, quantos testes).",
      "3. Se algo falhar por causa da sua mudança, corrija e rode de novo. Se falhar por outro motivo, explique e não esconda.",
      "4. Nunca desligue, pule ou apague testes e regras de lint para fazer algo passar.",
      "5. Se o projeto não tiver testes, diga isso claramente e explique como você conferiu o resultado.",
    ].join("\n");
  }
  return [
    "Antes de dizer que terminou:",
    "1. Confira cada número, nome e afirmação contra a fonte (código, documento, dado ou página consultada) e cite onde conferiu.",
    "2. Marque como hipótese tudo o que não pôde ser verificado.",
    "3. Se você editou arquivos do projeto, rode o linter e os testes indicados no CLAUDE.md e mostre o resultado.",
  ].join("\n");
}

/** Monta o system prompt completo e detalhado a partir da estrutura do agente. */
export function renderSystemPrompt(agent: Agent): string {
  const p = agent.prompt;
  return [
    `# Papel\n${p.role}`,
    `# Objetivo\n${p.goal}`,
    `# Passo a passo\n${p.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    `# Formato de saída\n${p.output.map((o) => `- ${o}`).join("\n")}`,
    `# Regras e limites\n${p.rules.map((r) => `- ${r}`).join("\n")}\n- Responda sempre em português do Brasil.\n- Peça confirmação antes de alterar muitos arquivos ou executar ações irreversíveis.\n- Nunca escreva segredos em arquivos versionados.`,
    `# Verificação antes de concluir\n${verificationSection(agent)}`,
    `# Critério de conclusão\n${p.done}`,
  ].join("\n\n");
}

export type CatalogAgent = Agent & { systemPrompt: string };

function parseAll<T extends z.ZodTypeAny>(schema: T, items: unknown[], label: string): z.output<T>[] {
  return items.map((item, i) => {
    const res = schema.safeParse(item);
    if (!res.success) {
      const id = (item as { id?: string }).id ?? `#${i}`;
      throw new Error(`Catálogo de ${label} inválido em "${id}": ${z.prettifyError(res.error)}`);
    }
    return res.data;
  });
}

function assertUnique(ids: string[], label: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Id duplicado no catálogo de ${label}: ${id}`);
    seen.add(id);
  }
}

const agentsParsed = parseAll(agentSchema, [...businessAgents, ...technicalAgents], "agentes");
const skillsParsed = parseAll(skillSchema, skillsInput, "skills");
const mcpsParsed = parseAll(mcpSchema, mcpsInput, "MCPs");
const presetsParsed = parseAll(presetSchema, presetsInput, "presets");

assertUnique(agentsParsed.map((a) => a.id), "agentes");
assertUnique(skillsParsed.map((s) => s.id), "skills");
assertUnique(mcpsParsed.map((m) => m.id), "MCPs");
assertUnique(presetsParsed.map((p) => p.id), "presets");

export const agents: CatalogAgent[] = agentsParsed.map((a) => ({ ...a, systemPrompt: renderSystemPrompt(a) }));
export const skills: Skill[] = skillsParsed;
export const mcps: Mcp[] = mcpsParsed;
export const presets: Preset[] = presetsParsed;

export const agentById = new Map(agents.map((a) => [a.id, a]));
export const skillById = new Map(skills.map((s) => [s.id, s]));
export const mcpById = new Map(mcps.map((m) => [m.id, m]));

// Referências cruzadas: presets e overlaps só apontam para itens existentes.
for (const p of presets) {
  for (const id of p.agents) if (!agentById.has(id)) throw new Error(`Preset ${p.id}: agente ${id} não existe`);
  for (const id of p.skills) if (!skillById.has(id)) throw new Error(`Preset ${p.id}: skill ${id} não existe`);
  for (const id of p.mcps) if (!mcpById.has(id)) throw new Error(`Preset ${p.id}: MCP ${id} não existe`);
}
for (const a of agents) for (const o of a.overlapsWith) if (!agentById.has(o)) throw new Error(`Agente ${a.id}: overlap ${o} não existe`);
for (const s of skills) for (const o of s.overlapsWith) if (!skillById.has(o)) throw new Error(`Skill ${s.id}: overlap ${o} não existe`);

export type CatalogItem =
  | { kind: "agent"; item: CatalogAgent }
  | { kind: "skill"; item: Skill }
  | { kind: "mcp"; item: Mcp };

export function getItem(kind: ItemKind, id: string) {
  if (kind === "agent") return agentById.get(id);
  if (kind === "skill") return skillById.get(id);
  return mcpById.get(id);
}

/** Resumo compacto enviado à IA para recomendação (economiza contexto). */
export function catalogSummaryForAI() {
  const line = (x: { id: string; name: string; category: string; appliesTo: string; stages: string[] }, desc: string) =>
    `${x.id} | ${x.name} | ${x.category} | ${x.appliesTo} | ${x.stages.join(",")} | ${desc}`;
  return {
    agents: agents.map((a) => line(a, a.description)).join("\n"),
    skills: skills.map((s) => line(s, s.summary)).join("\n"),
    mcps: mcps.map((m) => line(m, `${m.purpose} Risco: ${m.riskLevel}.`)).join("\n"),
  };
}

export const catalogStats = {
  agents: agents.length,
  skills: skills.length,
  mcps: mcps.length,
};
