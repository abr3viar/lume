import { z } from "zod";
import { agentById, agents, mcpById, mcps, skillById, skills, type ItemKind } from "@/data/catalog";
import { isTaskMode, recommendationSchema, type Recommendation, type RecommendRequest } from "@/lib/schemas";
import { safeParseJson } from "./parse";

export type RecommendedItem = Recommendation & { kind: ItemKind };

export const lineSchema = recommendationSchema.extend({ kind: z.enum(["agent", "skill", "mcp"]) });

export function countsFor(req: Pick<RecommendRequest, "kinds" | "more"> & { mode?: RecommendRequest["mode"] }) {
  const task = isTaskMode(req.mode);
  const initial = task ? ({ agent: [3, 5], skill: [3, 5], mcp: [2, 3] } as const) : ({ agent: [8, 12], skill: [6, 10], mcp: [5, 8] } as const);
  const more = task ? ({ agent: [2, 3], skill: [2, 3], mcp: [1, 2] } as const) : ({ agent: [4, 6], skill: [3, 5], mcp: [2, 4] } as const);
  const base = req.more ? more : initial;
  const out: Partial<Record<ItemKind, [number, number]>> = {};
  for (const k of req.kinds) out[k] = [base[k][0], base[k][1]];
  return out;
}

const exists: Record<ItemKind, (id: string) => boolean> = {
  agent: (id) => agentById.has(id),
  skill: (id) => skillById.has(id),
  mcp: (id) => mcpById.has(id),
};

export function eligibleIds(kind: ItemKind, exclude: string[]) {
  const all = kind === "agent" ? agents : kind === "skill" ? skills : mcps;
  const ex = new Set(exclude);
  return all.filter((x) => !ex.has(x.id)).map((x) => x.id);
}

/**
 * Filtra as recomendações: descarta ids inexistentes, duplicados, excluídos,
 * de tipos não pedidos e excedentes ao máximo por tipo.
 */
export class RecommendationFilter {
  private seen = new Set<string>();
  private count: Record<ItemKind, number> = { agent: 0, skill: 0, mcp: 0 };

  constructor(
    private req: Pick<RecommendRequest, "kinds" | "excludeIds" | "more"> & { mode?: RecommendRequest["mode"] },
    private counts = countsFor(req),
  ) {}

  accept(raw: unknown): RecommendedItem | null {
    const parsed = lineSchema.safeParse(raw);
    if (!parsed.success) return null;
    const item = parsed.data;
    const range = this.counts[item.kind];
    if (!range) return null;
    if (!exists[item.kind](item.id)) return null;
    if (this.req.excludeIds[item.kind].includes(item.id)) return null;
    const key = `${item.kind}:${item.id}`;
    if (this.seen.has(key)) return null;
    if (this.count[item.kind] >= range[1]) return null;
    this.seen.add(key);
    this.count[item.kind]++;
    return item;
  }

  acceptLine(line: string): RecommendedItem | null {
    return this.accept(safeParseJson(line));
  }

  /** Tipos que ficaram abaixo do mínimo e ainda têm itens elegíveis no catálogo. */
  missing(): Partial<Record<ItemKind, number>> {
    const out: Partial<Record<ItemKind, number>> = {};
    for (const kind of this.req.kinds) {
      const range = this.counts[kind]!;
      const available = eligibleIds(kind, [...this.req.excludeIds[kind], ...this.acceptedIds(kind)]).length;
      const need = Math.min(range[0] - this.count[kind], available);
      if (need > 0) out[kind] = need;
    }
    return out;
  }

  acceptedIds(kind: ItemKind) {
    return [...this.seen].filter((k) => k.startsWith(`${kind}:`)).map((k) => k.slice(kind.length + 1));
  }

  total() {
    return this.count.agent + this.count.skill + this.count.mcp;
  }
}
