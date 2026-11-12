import "server-only";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Provedor local: usa o Claude Code instalado e logado no seu computador (modo headless `claude -p`).
 * Não precisa de chave de API: o uso entra na sua conta do Claude.
 * Só funciona quando o Lume roda no seu PC (nunca na Vercel).
 *
 * Ative com LUME_AI_PROVIDER=claude-code no .env.local.
 */
export function claudeCodeEnabled() {
  return process.env.LUME_AI_PROVIDER?.trim() === "claude-code" && !process.env.VERCEL;
}

export function claudeCodeModels() {
  return {
    main: process.env.LUME_CLAUDE_MODEL?.trim() || "sonnet",
    fast: process.env.LUME_CLAUDE_MODEL_FAST?.trim() || "haiku",
  };
}

export class ClaudeCodeError extends Error {
  constructor(
    message: string,
    public kind: "nao-encontrado" | "limite" | "falha" | "tempo",
  ) {
    super(message);
  }
}

/** Pasta vazia de trabalho: o Claude não lê o projeto do Lume nem outros arquivos. */
function workDir() {
  const dir = join(tmpdir(), "lume-claude-code");
  mkdirSync(dir, { recursive: true });
  return dir;
}

type RunOptions = {
  system: string;
  prompt: string;
  model: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/** Executa `claude -p` e entrega o texto da resposta em pedaços, conforme chega. */
export async function* streamClaudeCode(opts: RunOptions): AsyncGenerator<string> {
  const bin = process.env.LUME_CLAUDE_BIN?.trim() || "claude";
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--tools",
    "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--effort",
    "low",
    "--model",
    opts.model,
    "--system-prompt",
    opts.system,
  ];
  const child = spawn(bin, args, { cwd: workDir(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true });

  const queue: string[] = [];
  let finished = false;
  let failure: ClaudeCodeError | null = null;
  let wake: (() => void) | null = null;
  const notify = () => {
    wake?.();
    wake = null;
  };
  let sawText = false;
  let buffer = "";
  let stderr = "";

  const timer = setTimeout(() => {
    failure = new ClaudeCodeError("O Claude Code demorou demais para responder.", "tempo");
    child.kill();
  }, opts.timeoutMs ?? 110_000);
  const onAbort = () => child.kill();
  opts.signal?.addEventListener("abort", onAbort);

  child.on("error", (err: NodeJS.ErrnoException) => {
    failure =
      err.code === "ENOENT"
        ? new ClaudeCodeError("Não encontramos o comando claude. Instale e faça login no Claude Code.", "nao-encontrado")
        : new ClaudeCodeError("Não foi possível iniciar o Claude Code.", "falha");
    finished = true;
    notify();
  });
  child.stderr.on("data", (d: Buffer) => {
    stderr = (stderr + d.toString("utf8")).slice(-2000);
  });
  child.stdout.on("data", (d: Buffer) => {
    buffer += d.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let ev: {
        type?: string;
        event?: { type?: string; delta?: { type?: string; text?: string } };
        is_error?: boolean;
        result?: string;
        subtype?: string;
      };
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (ev.type === "stream_event" && ev.event?.type === "content_block_delta" && ev.event.delta?.type === "text_delta") {
        sawText = true;
        queue.push(ev.event.delta.text ?? "");
      } else if (ev.type === "result") {
        if (ev.is_error) {
          const msg = String(ev.result ?? "");
          failure = /limit|limite|usage/i.test(msg)
            ? new ClaudeCodeError("Você atingiu o limite de uso do Claude por agora. Tente mais tarde.", "limite")
            : new ClaudeCodeError("O Claude Code respondeu com erro.", "falha");
        } else if (!sawText && ev.result) {
          queue.push(ev.result);
        }
      }
    }
    notify();
  });
  child.on("close", (code) => {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
    if (code !== 0 && !failure && !sawText && !opts.signal?.aborted) {
      failure = /login|auth|logged/i.test(stderr)
        ? new ClaudeCodeError("O Claude Code não está logado. Rode `claude` no terminal e faça login.", "falha")
        : new ClaudeCodeError("O Claude Code encerrou com erro.", "falha");
    }
    finished = true;
    notify();
  });

  child.stdin.end(opts.prompt, "utf8");

  for (;;) {
    while (queue.length) yield queue.shift()!;
    if (finished) break;
    await new Promise<void>((r) => (wake = r));
  }
  while (queue.length) yield queue.shift()!;
  const err = failure as ClaudeCodeError | null;
  if (err) throw err;
}

export async function runClaudeCode(opts: RunOptions): Promise<string> {
  let text = "";
  for await (const chunk of streamClaudeCode(opts)) text += chunk;
  return text;
}
