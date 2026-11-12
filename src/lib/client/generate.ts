"use client";

import { agentById, skillById } from "@/data/catalog";
import { baseKitInput, buildKitFiles, kitRoot, type KitFile, type KitInput } from "@/lib/kit/build";
import { buildZip } from "@/lib/kit/zip";
import {
  agentPersonalizationSchema,
  contextPersonalizationSchema,
  skillPersonalizationSchema,
  type ContextPersonalization,
  type Mode,
  type SaasInfo,
} from "@/lib/schemas";

export type GenTask = {
  key: string;
  label: string;
  state: "pendente" | "trabalhando" | "ok" | "base" | "erro";
};

export type GenProgress = { tasks: GenTask[]; done: number; total: number; current: string | null };

const CONCURRENCY = 3;
const TIMEOUT_MS = 55_000;

class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

async function postPersonalize(body: unknown, signal: AbortSignal): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal.addEventListener("abort", onAbort);
  try {
    const res = await fetch("/api/personalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new HttpError(res.status);
    const data = (await res.json()) as { result: unknown };
    return data.result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

/** Tenta de novo em erros transitórios (rede, 429, 5xx, timeout). 4xx de validação não repete. */
async function withRetry<T>(fn: () => Promise<T>, signal: AbortSignal, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (signal.aborted) throw err;
      // 503 = IA não configurada: não adianta repetir.
      const retriable = !(err instanceof HttpError) || err.status === 429 || (err.status >= 500 && err.status !== 503);
      if (!retriable || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 800 * 2 ** i + Math.random() * 400));
    }
  }
  throw last;
}

/** Executa tarefas com concorrência limitada, na ordem. */
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export type GenerateResult = {
  files: KitFile[];
  zip: Blob;
  fileName: string;
  activationPrompt: string;
  fallbacks: string[];
};

/**
 * Orquestra a geração no navegador: uma chamada curta por item, com concorrência 3,
 * retry e fallback para o template base. O zip é montado localmente com JSZip.
 */
export async function generateKit(
  params: { mode: Mode; saas: SaasInfo; ids: { agents: string[]; skills: string[]; mcps: string[] }; ai: boolean },
  onProgress: (p: GenProgress) => void,
  signal: AbortSignal,
): Promise<GenerateResult> {
  const { mode, saas, ids } = params;
  const input = baseKitInput(mode, saas, ids);
  if (!params.ai) return generateLocal(input, onProgress, signal);
  input.personalizationAttempted = true;

  const tasks: GenTask[] = [
    ...input.agents.map((a) => ({ key: `agent:${a.item.id}`, label: `Personalizando o agente ${a.item.name}`, state: "pendente" as const })),
    ...input.skills.map((s) => ({ key: `skill:${s.item.id}`, label: `Adaptando a skill ${s.item.name}`, state: "pendente" as const })),
    { key: "context", label: "Escrevendo o CLAUDE.md e o LEIA-ME", state: "pendente" as const },
    { key: "zip", label: "Montando o zip", state: "pendente" as const },
  ];
  let done = 0;
  const emit = (current: string | null) => onProgress({ tasks: tasks.map((t) => ({ ...t })), done, total: tasks.length, current });
  const setState = (key: string, state: GenTask["state"]) => {
    const t = tasks.find((x) => x.key === key)!;
    t.state = state;
    if (state === "ok" || state === "base" || state === "erro") done++;
    emit(state === "trabalhando" ? t.label : null);
  };
  emit(null);

  const aiTasks = tasks.filter((t) => t.key !== "zip");
  let context: ContextPersonalization | null = null;

  await pool(aiTasks, CONCURRENCY, async (task) => {
    if (signal.aborted) return;
    setState(task.key, "trabalhando");
    try {
      if (task.key === "context") {
        const raw = await withRetry(
          () =>
            postPersonalize(
              {
                kind: "context",
                mode,
                saas,
                items: [
                  ...ids.agents.map((id) => ({ kind: "agent", id })),
                  ...ids.skills.map((id) => ({ kind: "skill", id })),
                  ...ids.mcps.map((id) => ({ kind: "mcp", id })),
                ],
              },
              signal,
            ),
          signal,
        );
        context = contextPersonalizationSchema.parse(raw);
        setState(task.key, "ok");
        return;
      }
      const [kind, id] = task.key.split(":") as ["agent" | "skill", string];
      const raw = await withRetry(() => postPersonalize({ kind, id, mode, saas }, signal), signal);
      if (kind === "agent") {
        const out = agentPersonalizationSchema.parse(raw);
        const a = input.agents.find((x) => x.item.id === id)!;
        Object.assign(a, { description: out.description, prompt: out.prompt, personalized: true });
      } else {
        const out = skillPersonalizationSchema.parse(raw);
        const s = input.skills.find((x) => x.item.id === id)!;
        Object.assign(s, { description: out.description, body: out.body, personalized: true });
      }
      setState(task.key, "ok");
    } catch {
      if (signal.aborted) return;
      // Fallback: mantém o template base, que já funciona, e registra no LEIA-ME.
      setState(task.key, "base");
    }
  });

  if (signal.aborted) throw new DOMException("Cancelado", "AbortError");

  input.context = context;
  setState("zip", "trabalhando");
  const result = await packKit(input);
  setState("zip", "ok");
  return {
    ...result,
    fallbacks: [
      ...input.agents.filter((a) => !a.personalized).map((a) => agentById.get(a.item.id)?.name ?? a.item.id),
      ...input.skills.filter((s) => !s.personalized).map((s) => skillById.get(s.item.id)?.name ?? s.item.id),
    ],
  };
}

async function packKit(input: KitInput) {
  const files = buildKitFiles(input);
  const root = kitRoot(input.saas);
  const bytes = await buildZip(files, root);
  return {
    files,
    zip: new Blob([bytes as BlobPart], { type: "application/zip" }),
    fileName: `${root}.zip`,
    activationPrompt: files.find((f) => f.path === "PROMPT-DE-ATIVACAO.md")?.content ?? "",
  };
}

const nextFrame = () => new Promise<void>((r) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => r()) : r()));

/**
 * Modo sem chave: monta o kit com os modelos base, sem chamar a IA.
 * O progresso é real (um passo por arquivo) e cede um quadro entre itens para a tela atualizar.
 * A adaptação fina acontece no Claude Code: o prompt de ativação pede isso.
 */
async function generateLocal(input: KitInput, onProgress: (p: GenProgress) => void, signal: AbortSignal): Promise<GenerateResult> {
  const tasks: GenTask[] = [
    ...input.agents.map((a) => ({ key: `agent:${a.item.id}`, label: `Preparando o agente ${a.item.name}`, state: "pendente" as const })),
    ...input.skills.map((s) => ({ key: `skill:${s.item.id}`, label: `Preparando a skill ${s.item.name}`, state: "pendente" as const })),
    { key: "context", label: "Escrevendo o CLAUDE.md e o LEIA-ME", state: "pendente" as const },
    { key: "zip", label: "Montando o zip", state: "pendente" as const },
  ];
  let done = 0;
  for (const t of tasks) {
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
    t.state = "trabalhando";
    onProgress({ tasks: tasks.map((x) => ({ ...x })), done, total: tasks.length, current: t.label });
    await nextFrame();
    if (t.key === "zip") {
      const result = await packKit(input);
      t.state = "ok";
      done++;
      onProgress({ tasks: tasks.map((x) => ({ ...x })), done, total: tasks.length, current: null });
      return { ...result, fallbacks: [] };
    }
    t.state = "ok";
    done++;
  }
  throw new Error("Geração interrompida");
}

/** Extrai só o texto do bloco do prompt de ativação (o que a pessoa vai colar). */
export function extractPromptBlock(md: string) {
  const m = /```text\n([\s\S]*?)```/.exec(md);
  return (m ? m[1] : md).trim();
}
