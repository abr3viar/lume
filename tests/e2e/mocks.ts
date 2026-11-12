import type { Page, Route } from "@playwright/test";
import { agents, mcps, skills } from "../../src/data/catalog";

type Kind = "agent" | "skill" | "mcp";
const POOL: Record<Kind, string[]> = {
  agent: agents.map((a) => a.id),
  skill: skills.map((s) => s.id),
  mcp: mcps.map((m) => m.id),
};

/** Ids que o mock de personalização faz "falhar" (para testar o fallback). */
export const FAIL_IDS = new Set(["churn-retencao"]);

/** Simula /api/recommend com SSE: devolve itens do catálogo, respeitando exclusões. */
export async function mockRecommend(route: Route) {
  const body = route.request().postDataJSON() as {
    kinds: Kind[];
    more: boolean;
    excludeIds: Record<Kind, string[]>;
  };
  const count = body.more ? { agent: 4, skill: 3, mcp: 2 } : { agent: 9, skill: 6, mcp: 5 };
  const lines: string[] = [`data: ${JSON.stringify({ type: "meta", source: "ia", provider: "api" })}\n\n`];
  for (const kind of body.kinds) {
    const ids = POOL[kind].filter((id) => !body.excludeIds[kind].includes(id)).slice(0, count[kind]);
    for (const [i, id] of ids.entries()) {
      lines.push(
        `data: ${JSON.stringify({
          type: "item",
          item: { kind, id, reason: `Mock: ${id} ajuda o seu SaaS a crescer com segurança.`, impact: i < 3 ? "alto" : "médio" },
        })}\n\n`,
      );
    }
  }
  lines.push(`data: ${JSON.stringify({ type: "done", count: lines.length })}\n\n`);
  await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: lines.join("") });
}

/** Simula /api/personalize: adapta o texto, falha de propósito para FAIL_IDS. */
export async function mockPersonalize(route: Route) {
  const body = route.request().postDataJSON() as { kind: string; id?: string; items?: { id: string }[] };
  if (body.id && FAIL_IDS.has(body.id)) {
    return route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: "mock" }) });
  }
  let result: unknown;
  if (body.kind === "agent") {
    const a = agents.find((x) => x.id === body.id)!;
    result = { description: `Use para ${a.name.toLowerCase()} no SaaS de teste.`, prompt: `${a.systemPrompt}\n\n<!-- personalizado-e2e -->` };
  } else if (body.kind === "skill") {
    const s = skills.find((x) => x.id === body.id)!;
    result = { description: `${s.description} (personalizado)`, body: `${s.body}\n\n<!-- personalizado-e2e -->` };
  } else {
    result = {
      summary: "Resumo de teste do SaaS gerado pelo mock, com foco no próximo passo do negócio.",
      focus: ["Ativar os primeiros clientes", "Medir a retenção"],
      usage: (body.items ?? []).map((i) => ({ id: i.id, whenToUse: `Quando precisar de ${i.id}.`, example: `Use ${i.id} agora.` })),
    };
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result }) });
}

export async function installAiMocks(page: Page) {
  await page.route("**/api/recommend", mockRecommend);
  await page.route("**/api/personalize", mockPersonalize);
}
