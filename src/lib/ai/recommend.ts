import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { catalogSummaryForAI, type ItemKind } from "@/data/catalog";
import type { RecommendRequest } from "@/lib/schemas";
import { ClaudeCodeError, claudeCodeEnabled, claudeCodeModels, streamClaudeCode } from "./claude-code";
import { getClient, models, supportsBetweenTools, supportsServerFallback } from "./client";
import { LineBuffer } from "./parse";
import { RECOMMEND_SYSTEM, recommendUserPrompt, saasInfoBlock } from "./prompts";
import { countsFor, essentialMax, lineSchema, RecommendationFilter, type RecommendedItem } from "./recommend-core";

function catalogFor(req: RecommendRequest, extraExclude: Partial<Record<ItemKind, string[]>> = {}) {
  const full = catalogSummaryForAI();
  const filter = (kind: ItemKind, text: string) => {
    const ex = new Set([...req.excludeIds[kind], ...(extraExclude[kind] ?? [])]);
    return text
      .split("\n")
      .filter((line) => !ex.has(line.split(" | ")[0]))
      .join("\n");
  };
  return {
    agents: req.kinds.includes("agent") ? filter("agent", full.agents) : undefined,
    skills: req.kinds.includes("skill") ? filter("skill", full.skills) : undefined,
    mcps: req.kinds.includes("mcp") ? filter("mcp", full.mcps) : undefined,
  };
}

/**
 * Mesma lógica usando o Claude Code local (`claude -p`), sem chave de API.
 * Uma chamada em streaming e, se faltar algum tipo, uma nova tentativa pedindo só o que faltou.
 */
async function* streamRecommendationsClaudeCode(req: RecommendRequest, signal?: AbortSignal): AsyncGenerator<RecommendedItem> {
  const { main } = claudeCodeModels();
  const filter = new RecommendationFilter(req);
  const saasBlock = saasInfoBlock(req.saas, req.mode);
  const run = async function* (kinds: ItemKind[], counts: ReturnType<typeof countsFor>, extra: Partial<Record<ItemKind, string[]>>) {
    const lines = new LineBuffer();
    const prompt = recommendUserPrompt({ saasBlock, catalog: catalogFor({ ...req, kinds }, extra), counts, essential: essentialMax(req) });
    for await (const chunk of streamClaudeCode({ system: RECOMMEND_SYSTEM, prompt, model: main, signal })) {
      for (const line of lines.push(chunk)) {
        const item = filter.acceptLine(line);
        if (item) yield item;
      }
    }
    for (const line of lines.flush()) {
      const item = filter.acceptLine(line);
      if (item) yield item;
    }
  };

  let firstError: unknown = null;
  try {
    yield* run(req.kinds, countsFor(req), {});
  } catch (err) {
    if (signal?.aborted) return;
    firstError = err;
  }
  const missing = filter.missing();
  const kinds = Object.keys(missing) as ItemKind[];
  if (kinds.length && !(firstError instanceof ClaudeCodeError && firstError.kind !== "falha")) {
    try {
      const counts = Object.fromEntries(kinds.map((k) => [k, [missing[k]!, missing[k]! + 2]]));
      yield* run(kinds, counts, Object.fromEntries(kinds.map((k) => [k, filter.acceptedIds(k)])));
    } catch (err) {
      if (filter.total() === 0) throw firstError ?? err;
    }
  }
  if (filter.total() === 0 && firstError) throw firstError;
}

/** Escolhe o provedor: Claude Code local (se ativado) ou API da Anthropic. */
export function streamRecommendations(req: RecommendRequest, signal?: AbortSignal): AsyncGenerator<RecommendedItem> {
  return claudeCodeEnabled() ? streamRecommendationsClaudeCode(req, signal) : streamRecommendationsApi(req, signal);
}

/**
 * Gera recomendações em streaming. Cada linha NDJSON válida vira um item assim que chega.
 * Se algum tipo ficar abaixo do mínimo (ou o streaming falhar), faz 1 nova tentativa
 * com saída estruturada pedindo só o que faltou.
 */
async function* streamRecommendationsApi(req: RecommendRequest, signal?: AbortSignal): AsyncGenerator<RecommendedItem> {
  const client = getClient();
  const { main } = models();
  const filter = new RecommendationFilter(req);
  const saasBlock = saasInfoBlock(req.saas, req.mode);

  const params = {
    model: main,
    max_tokens: 8000,
    system: RECOMMEND_SYSTEM,
    output_config: { effort: "low" as const },
    ...(supportsBetweenTools(main) ? { thinking: { type: "between_tools" as const } } : {}),
    messages: [
      {
        role: "user" as const,
        content: recommendUserPrompt({ saasBlock, catalog: catalogFor(req), counts: countsFor(req), essential: essentialMax(req) }),
      },
    ],
  };

  let streamError: unknown = null;
  try {
    const stream = supportsServerFallback(main)
      ? client.beta.messages.stream(
          { ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" },
          { signal },
        )
      : client.messages.stream(params, { signal });
    const lines = new LineBuffer();
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        for (const line of lines.push(event.delta.text)) {
          const item = filter.acceptLine(line);
          if (item) yield item;
        }
      }
    }
    for (const line of lines.flush()) {
      const item = filter.acceptLine(line);
      if (item) yield item;
    }
  } catch (err) {
    if (signal?.aborted) return;
    streamError = err;
  }

  // Retry único com saída estruturada para o que faltou.
  const missing = filter.missing();
  const missingKinds = Object.keys(missing) as ItemKind[];
  if (missingKinds.length === 0) return;

  try {
    const retryReq: RecommendRequest = { ...req, kinds: missingKinds };
    const extraExclude = Object.fromEntries(missingKinds.map((k) => [k, filter.acceptedIds(k)]));
    const schema = z.object({ items: z.array(lineSchema) });
    const counts = Object.fromEntries(missingKinds.map((k) => [k, [missing[k]!, missing[k]! + 2]])) as Partial<
      Record<ItemKind, [number, number]>
    >;
    const res = await client.messages.parse(
      {
        model: main,
        max_tokens: 6000,
        system: RECOMMEND_SYSTEM.replace(/Formato de saída OBRIGATÓRIO[\s\S]*$/, "Responda no formato JSON pedido."),
        output_config: { effort: "low", format: zodOutputFormat(schema) },
        messages: [
          {
            role: "user",
            content: recommendUserPrompt({ saasBlock, catalog: catalogFor(retryReq, extraExclude), counts, essential: essentialMax(req) }),
          },
        ],
      },
      { signal },
    );
    for (const raw of res.parsed_output?.items ?? []) {
      const item = filter.accept(raw);
      if (item) yield item;
    }
  } catch (err) {
    if (filter.total() === 0) throw streamError ?? err;
  }

  if (filter.total() === 0 && streamError) throw streamError;
}
