import { agentById, mcpById, skillById, type ItemKind, type Mcp } from "@/data/catalog";

export const KIND_LABEL: Record<ItemKind, { one: string; many: string }> = {
  agent: { one: "Agente", many: "Agentes" },
  skill: { one: "Skill", many: "Skills" },
  mcp: { one: "MCP", many: "MCPs" },
};

export const RISK_META: Record<Mcp["riskLevel"], { label: string; tone: "calm" | "warn" | "strong" }> = {
  leitura: { label: "Somente leitura", tone: "calm" },
  escrita: { label: "Escreve dados", tone: "warn" },
  amplo: { label: "Acesso amplo", tone: "strong" },
};

export type ItemMeta = {
  kind: ItemKind;
  id: string;
  name: string;
  category: string;
  description: string;
  /** Uma linha: quando usar (agente), para que serve (skill/MCP). */
  whenToUse: string;
  effort: "fácil" | "médio" | "avançado";
  appliesTo: "B2B" | "B2C" | "ambos";
  mcp?: Mcp;
};

export function itemMeta(kind: ItemKind, id: string): ItemMeta | null {
  if (kind === "agent") {
    const a = agentById.get(id);
    return a ? { kind, id, name: a.name, category: a.category, description: a.description, whenToUse: a.whenToUse, effort: a.effort, appliesTo: a.appliesTo } : null;
  }
  if (kind === "skill") {
    const s = skillById.get(id);
    return s ? { kind, id, name: s.name, category: s.category, description: s.summary, whenToUse: s.summary, effort: s.effort, appliesTo: s.appliesTo } : null;
  }
  const m = mcpById.get(id);
  return m
    ? { kind, id, name: m.name, category: m.category, description: m.purpose, whenToUse: m.purpose, effort: m.effort, appliesTo: m.appliesTo, mcp: m }
    : null;
}
