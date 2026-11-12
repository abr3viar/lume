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

export type GenProgress = {
  tasks: GenTask[];
  done: number;
  total: number;
  current: string | null;
  /** Chamadas simultâneas no momento (concorrência adaptativa). */
  concurrency: number;
};

export type GenerateResult = {
  files: KitFile[];
  zip: Blob;
  fileName: string;
  activationPrompt: string;
  /** Nomes dos itens que ficaram com o modelo base. */
  fallbacks: string[];
  /** Chaves das tarefas que podem ser tentadas de novo. */
  fallbackKeys: string[];
  /** true quando o zip foi montado antes de a personalização terminar. */
  partial: boolean;
};

const TIMEOUT_MS = 115_000;

export class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

/**
 * Concorrência adaptativa: começa em `start`, sobe 1 a cada `growEvery` sucessos seguidos
 * (até `max`) e cai pela metade ao receber 429 (limite de taxa).
 */
export class AdaptiveLimit {
  private streak = 0;
  constructor(
    public current = 3,
    private min = 1,
    private max = 6,
    private growEvery = 3,
  ) {}
  onSuccess() {
    this.streak++;
    if (this.streak >= this.growEvery && this.current < this.max) {
      this.current++;
      this.streak = 0;
    }
  }
  onRateLimit() {
    this.current = Math.max(this.min, Math.floor(this.current / 2));
    this.streak = 0;
  }
}

/** Executa itens respeitando um limite que pode mudar durante a execução. */
export function dynamicPool<T>(items: T[], limit: { current: number }, worker: (item: T) => Promise<void>) {
  return new Promise<void>((resolve) => {
    let next = 0;
    let running = 0;
    const pump = () => {
      if (next >= items.length && running === 0) return resolve();
      while (running < limit.current && next < items.length) {
        const item = items[next++];
        running++;
        void worker(item).finally(() => {
          running--;
          pump();
        });
      }
    };
    pump();
  });
}

/** Tenta de novo em erros transitórios (rede, 429, 5xx, timeout). 4xx de validação e 503 não repetem. */
export async function withRetry<T>(fn: () => Promise<T>, signal: AbortSignal, attempts = 3, baseDelay = 800): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (signal.aborted) throw err;
      const retriable = !(err instanceof HttpError) || err.status === 429 || (err.status >= 500 && err.status !== 503);
      if (!retriable || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** i + Math.random() * (baseDelay / 2)));
    }
  }
  throw last;
}

const nextFrame = () =>
  new Promise<void>((r) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => r()) : r()));

type Params = {
  mode: Mode;
  saas: SaasInfo;
  ids: { agents: string[]; skills: string[]; mcps: string[] };
  ai: boolean;
  origins?: KitInput["origins"];
  aiProvider?: KitInput["aiProvider"];
};

/**
 * Uma geração de kit com estado. Personaliza item a item (uma chamada curta por item),
 * pode ser empacotada a qualquer momento (download parcial) e reexecutada só para os
 * itens que caíram no modelo base. O zip é montado no navegador com JSZip.
 */
export class KitGeneration {
  readonly input: KitInput;
  readonly tasks: GenTask[];
  readonly limit = new AdaptiveLimit();
  private context: ContextPersonalization | null = null;

  constructor(
    private params: Params,
    private onProgress: (p: GenProgress) => void,
  ) {
    this.input = baseKitInput(params.mode, params.saas, params.ids);
    this.input.origins = params.origins;
    this.input.aiProvider = params.aiProvider;
    const verb = params.ai ? ["Personalizando o agente", "Adaptando a skill"] : ["Preparando o agente", "Preparando a skill"];
    this.tasks = [
      ...this.input.agents.map((a) => ({ key: `agent:${a.item.id}`, label: `${verb[0]} ${a.item.name}`, state: "pendente" as const })),
      ...this.input.skills.map((s) => ({ key: `skill:${s.item.id}`, label: `${verb[1]} ${s.item.name}`, state: "pendente" as const })),
      { key: "context", label: "Escrevendo o CLAUDE.md e o LEIA-ME", state: "pendente" as const },
    ];
  }

  private emit(current: string | null) {
    const done = this.tasks.filter((t) => t.state === "ok" || t.state === "base" || t.state === "erro").length;
    this.onProgress({ tasks: this.tasks.map((t) => ({ ...t })), done, total: this.tasks.length, current, concurrency: this.limit.current });
  }

  private set(key: string, state: GenTask["state"]) {
    const t = this.tasks.find((x) => x.key === key)!;
    t.state = state;
    this.emit(state === "trabalhando" ? t.label : null);
  }

  /** Personaliza as tarefas indicadas (padrão: todas as pendentes). */
  async run(signal: AbortSignal, keys?: string[]) {
    const todo = this.tasks.filter((t) => (keys ? keys.includes(t.key) : t.state === "pendente"));
    for (const t of todo) t.state = "pendente";
    this.emit(null);

    if (!this.params.ai) {
      // Modo sem IA: os modelos base já estão prontos; marca item a item, cedendo um quadro.
      for (const t of todo) {
        if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
        this.set(t.key, "trabalhando");
        await nextFrame();
        this.set(t.key, "ok");
      }
      return;
    }

    this.input.personalizationAttempted = true;
    await dynamicPool(todo, this.limit, async (task) => {
      if (signal.aborted) return;
      this.set(task.key, "trabalhando");
      try {
        await this.personalizeTask(task.key, signal);
        this.set(task.key, "ok");
      } catch {
        if (signal.aborted) return;
        // Fallback: mantém o modelo base, que já funciona; o LEIA-ME registra.
        this.set(task.key, "base");
      }
    });
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
  }

  /** Reexecuta só os itens que ficaram com o modelo base. */
  retryFailed(signal: AbortSignal) {
    return this.run(signal, this.tasks.filter((t) => t.state === "base" || t.state === "erro").map((t) => t.key));
  }

  private async post(body: unknown, signal: AbortSignal): Promise<unknown> {
    return withRetry(async () => {
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
        if (res.status === 429) this.limit.onRateLimit();
        if (!res.ok) throw new HttpError(res.status);
        this.limit.onSuccess();
        return ((await res.json()) as { result: unknown }).result;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
      }
    }, signal);
  }

  private async personalizeTask(key: string, signal: AbortSignal) {
    const { mode, saas, ids } = this.params;
    if (key === "context") {
      const items = [
        ...ids.agents.map((id) => ({ kind: "agent", id })),
        ...ids.skills.map((id) => ({ kind: "skill", id })),
        ...ids.mcps.map((id) => ({ kind: "mcp", id })),
      ];
      this.context = contextPersonalizationSchema.parse(await this.post({ kind: "context", mode, saas, items }, signal));
      return;
    }
    const [kind, id] = key.split(":") as ["agent" | "skill", string];
    const raw = await this.post({ kind, id, mode, saas }, signal);
    if (kind === "agent") {
      const out = agentPersonalizationSchema.parse(raw);
      Object.assign(this.input.agents.find((x) => x.item.id === id)!, { description: out.description, prompt: out.prompt, personalized: true });
    } else {
      const out = skillPersonalizationSchema.parse(raw);
      Object.assign(this.input.skills.find((x) => x.item.id === id)!, { description: out.description, body: out.body, personalized: true });
    }
  }

  /** Monta o zip com o estado atual: o que já foi personalizado + modelo base no resto. */
  async pack(): Promise<GenerateResult> {
    this.input.context = this.context;
    const files = buildKitFiles(this.input);
    const root = kitRoot(this.input.saas);
    const bytes = await buildZip(files, root);
    const notDone = this.tasks.filter((t) => t.state !== "ok");
    return {
      files,
      zip: new Blob([bytes as BlobPart], { type: "application/zip" }),
      fileName: `${root}.zip`,
      activationPrompt: files.find((f) => f.path === "PROMPT-DE-ATIVACAO.md")?.content ?? "",
      fallbacks: this.params.ai
        ? [
            ...this.input.agents.filter((a) => !a.personalized).map((a) => agentById.get(a.item.id)?.name ?? a.item.id),
            ...this.input.skills.filter((s) => !s.personalized).map((s) => skillById.get(s.item.id)?.name ?? s.item.id),
          ]
        : [],
      fallbackKeys: this.params.ai ? notDone.filter((t) => t.state === "base" || t.state === "erro").map((t) => t.key) : [],
      partial: notDone.some((t) => t.state === "pendente" || t.state === "trabalhando"),
    };
  }
}

/** Atalho: gera do começo ao fim e devolve o zip. */
export async function generateKit(params: Params, onProgress: (p: GenProgress) => void, signal: AbortSignal) {
  const gen = new KitGeneration(params, onProgress);
  await gen.run(signal);
  return gen.pack();
}

/** Extrai só o texto do bloco do prompt de ativação (o que a pessoa vai colar). */
export function extractPromptBlock(md: string) {
  const m = /```text\n([\s\S]*?)```/.exec(md);
  return (m ? m[1] : md).trim();
}
