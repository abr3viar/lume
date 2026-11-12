import { agentById, mcpById, skillById, type Audience, type Preset } from "@/data/catalog";
import type { BusinessModel, Mode } from "@/lib/schemas";

function fits(applies: Audience, model: BusinessModel | "" | undefined) {
  if (!model || model === "B2B2C" || applies === "ambos") return true;
  return applies === model;
}

/**
 * Ajusta um kit pronto ao SaaS: remove itens pensados para outro modelo de negócio e,
 * no modo "do zero", garante os itens de fundação. As recomendações da IA servem para
 * destacar quais itens do preset ela também sugeriu.
 */
export function adaptPreset(
  preset: Preset,
  ctx: { model?: BusinessModel | ""; mode: Mode | null; recommended?: { agent: string[]; skill: string[]; mcp: string[] } },
) {
  const dropped: string[] = [];
  const keep = <T extends { id: string; name: string; appliesTo: Audience }>(ids: string[], get: (id: string) => T | undefined) =>
    ids.filter((id) => {
      const it = get(id);
      if (!it) return false;
      if (!fits(it.appliesTo, ctx.model)) {
        dropped.push(it.name);
        return false;
      }
      return true;
    });

  const agents = keep(preset.agents, (id) => agentById.get(id));
  const skills = keep(preset.skills, (id) => skillById.get(id));
  const mcps = keep(preset.mcps, (id) => mcpById.get(id));
  const added: string[] = [];
  if (ctx.mode === "zero") {
    if (!skills.includes("brief-do-projeto")) {
      skills.unshift("brief-do-projeto");
      added.push("Brief do projeto");
    }
    if (!agents.includes("arquiteto-produto")) {
      agents.unshift("arquiteto-produto");
      added.push("Arquiteto de produto");
    }
  }
  const rec = ctx.recommended;
  const alsoSuggested = rec
    ? agents.filter((id) => rec.agent.includes(id)).length +
      skills.filter((id) => rec.skill.includes(id)).length +
      mcps.filter((id) => rec.mcp.includes(id)).length
    : 0;
  return { agent: agents, skill: skills, mcp: mcps, dropped, added, alsoSuggested, total: agents.length + skills.length + mcps.length };
}
