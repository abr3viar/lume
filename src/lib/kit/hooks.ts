import type { KitFile } from "./build";
import type { StackProfile } from "./stacks";

/**
 * Proteções e automações do Claude Code geradas para o projeto (.claude/settings.json).
 * Formato conferido na documentação oficial (code.claude.com/docs/en/hooks, /permissions,
 * /settings-example) em 2026-11-12:
 * - `permissions.deny` / `permissions.ask` com regras `Read(./.env)` e `Bash(git push *)`.
 *   Regras deny e ask valem mesmo antes de a pasta ser marcada como confiável.
 * - `hooks.PostToolUse` com matcher "Edit|Write" para formatar o arquivo editado.
 * - `hooks.Stop` para o typecheck: `decision: "block"` faz o Claude continuar; `stop_hook_active`
 *   evita loop (só bloqueia uma vez). A forma `command` + `args` roda o executável direto,
 *   sem depender do shell (funciona igual no Windows e no Linux).
 * Nada aqui contém segredos.
 */

export const DENY_RULES = [
  "Read(./.env)",
  "Read(./.env.local)",
  "Read(./.env.*.local)",
  "Read(./.env.production)",
  "Read(./secrets/**)",
  "Edit(./.env)",
  "Edit(./.env.local)",
  "Edit(./.env.production)",
  "Bash(rm -rf *)",
  "Bash(git push --force *)",
  "Bash(git push -f *)",
  "Bash(git reset --hard *)",
  "Bash(git clean -fd *)",
];
export const ASK_RULES = ["Bash(git push *)"];

type HookEntry = { type: "command"; command: string; args: string[]; timeout: number };
type Group = { matcher?: string; hooks: HookEntry[] };

const PROJECT = "${CLAUDE_PROJECT_DIR}";

/** Formata o arquivo editado com o Prettier do projeto, se ele estiver instalado. Nunca bloqueia. */
const FORMAT_NODE = `// Kit gerado pelo Lume. Hook PostToolUse (Edit|Write): formata o arquivo editado com o Prettier do projeto.
// Se o Prettier não estiver instalado no projeto, não faz nada. Nunca bloqueia o Claude.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";

const EXT = /\\.(c|m)?(j|t)sx?$|\\.(json|css|scss|md|mdx|html|ya?ml)$/i;
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  try {
    const file = JSON.parse(input)?.tool_input?.file_path;
    if (!file || !EXT.test(file)) return;
    const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const bin = createRequire(join(dir, "package.json")).resolve("prettier/bin/prettier.cjs");
    execFileSync(process.execPath, [bin, "--write", "--log-level", "warn", file], { cwd: dir, stdio: "ignore", timeout: 25000 });
  } catch {
    // Sem Prettier ou arquivo ignorado: segue sem formatar.
  }
});
`;

/** Ao terminar, roda o typecheck se arquivos TypeScript mudaram; bloqueia uma única vez. */
const TYPECHECK_NODE = `// Kit gerado pelo Lume. Hook Stop: antes de o Claude dizer que terminou, roda o typecheck
// se algum arquivo TypeScript mudou. Se falhar, pede para o Claude corrigir (uma única vez).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let data = {};
  try { data = JSON.parse(input); } catch {}
  if (data.stop_hook_active) return; // já pedimos uma vez: não prende o Claude em loop
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!existsSync(join(dir, "tsconfig.json"))) return;
  try {
    const changed = execFileSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8", timeout: 10000 });
    if (!/\\.(m|c)?tsx?$/m.test(changed)) return; // nenhum arquivo TypeScript mudou
  } catch {
    // sem git: roda o typecheck mesmo assim
  }
  let tsc;
  try {
    tsc = createRequire(join(dir, "package.json")).resolve("typescript/bin/tsc");
  } catch {
    return; // TypeScript não instalado no projeto
  }
  try {
    execFileSync(process.execPath, [tsc, "--noEmit", "-p", dir], { cwd: dir, encoding: "utf8", timeout: 120000 });
  } catch (err) {
    const out = String(err.stdout || err.message || "").split("\\n").slice(0, 20).join("\\n");
    process.stdout.write(JSON.stringify({
      decision: "block",
      reason: "O typecheck falhou (tsc --noEmit). Corrija os erros causados pela sua mudança e rode de novo; se forem antigos, explique isso ao usuário.\\n" + out,
    }));
  }
});
`;

/** Formata o arquivo Python editado com ruff ou black, se instalados. Nunca bloqueia. */
const FORMAT_PY = `# Kit gerado pelo Lume. Hook PostToolUse (Edit|Write): formata o arquivo Python editado
# com ruff (ou black), se estiver instalado. Se não estiver, não faz nada.
import json, os, shutil, subprocess, sys

try:
    file = json.load(sys.stdin).get("tool_input", {}).get("file_path", "")
except Exception:
    sys.exit(0)
if not file.endswith(".py"):
    sys.exit(0)
cwd = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
if shutil.which("ruff"):
    cmd = ["ruff", "format", file]
elif shutil.which("black"):
    cmd = ["black", "-q", file]
else:
    sys.exit(0)
try:
    subprocess.run(cmd, cwd=cwd, timeout=25, capture_output=True)
except Exception:
    pass
`;

export type HooksPlan = {
  files: KitFile[];
  /** Descrição curta de cada automação, para o LEIA-ME e o CLAUDE.md. */
  automations: string[];
};

export function hooksFor(stacks: StackProfile[]): HooksPlan {
  const post: Group[] = [];
  const stop: Group[] = [];
  const files: KitFile[] = [];
  const automations: string[] = [];
  const ids = new Set(stacks.map((s) => s.id));

  if (ids.has("node-ts")) {
    files.push({ path: ".claude/hooks/formatar.mjs", content: FORMAT_NODE });
    files.push({ path: ".claude/hooks/verificar-tipos.mjs", content: TYPECHECK_NODE });
    post.push({
      matcher: "Edit|Write",
      hooks: [{ type: "command", command: "node", args: [`${PROJECT}/.claude/hooks/formatar.mjs`], timeout: 30 }],
    });
    stop.push({ hooks: [{ type: "command", command: "node", args: [`${PROJECT}/.claude/hooks/verificar-tipos.mjs`], timeout: 150 }] });
    automations.push("Formata com o Prettier do projeto cada arquivo que o Claude editar (se o Prettier estiver instalado).");
    automations.push("Antes de o Claude dizer que terminou, roda `tsc --noEmit` se algum arquivo TypeScript mudou, e pede a correção uma vez se falhar.");
  }
  if (ids.has("python")) {
    files.push({ path: ".claude/hooks/formatar.py", content: FORMAT_PY });
    post.push({
      matcher: "Edit|Write",
      hooks: [{ type: "command", command: "python", args: [`${PROJECT}/.claude/hooks/formatar.py`], timeout: 30 }],
    });
    automations.push("Formata com ruff (ou black) cada arquivo Python que o Claude editar, se estiver instalado.");
  }

  const settings: Record<string, unknown> = {
    permissions: { deny: DENY_RULES, ask: ASK_RULES },
  };
  const hooks: Record<string, Group[]> = {};
  if (post.length) hooks.PostToolUse = post;
  if (stop.length) hooks.Stop = stop;
  if (Object.keys(hooks).length) settings.hooks = hooks;

  files.unshift({ path: ".claude/settings.json", content: `${JSON.stringify(settings, null, 2)}\n` });
  return { files, automations };
}
