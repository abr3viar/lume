import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { baseKitInput, buildKitFiles } from "@/lib/kit/build";
import { DENY_RULES, hooksFor } from "@/lib/kit/hooks";
import { detectStacks, STACK_PROFILES } from "@/lib/kit/stacks";
import { saasInfoSchema } from "@/lib/schemas";

const hookEntry = z.object({ type: z.literal("command"), command: z.string(), args: z.array(z.string()), timeout: z.number().positive() }).strict();
/** Formato documentado em code.claude.com/docs/en/hooks e /settings-example. */
const settingsSchema = z
  .object({
    permissions: z.object({ deny: z.array(z.string()), ask: z.array(z.string()) }).strict(),
    hooks: z
      .object({
        PostToolUse: z.array(z.object({ matcher: z.string(), hooks: z.array(hookEntry) }).strict()).optional(),
        Stop: z.array(z.object({ hooks: z.array(hookEntry) }).strict()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const profile = (id: string) => STACK_PROFILES.filter((p) => p.id === id);

describe("settings.json gerado", () => {
  it("segue o formato documentado e bloqueia .env sem bloquear .env.example", () => {
    const { files } = hooksFor(profile("node-ts"));
    const settings = JSON.parse(files.find((f) => f.path === ".claude/settings.json")!.content);
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    expect(settings.permissions.deny).toContain("Read(./.env)");
    expect(settings.permissions.deny).toContain("Bash(git push --force *)");
    expect(settings.permissions.ask).toEqual(["Bash(git push *)"]);
    expect(DENY_RULES.some((r) => r.includes(".env.example") || r === "Read(./.env.*)")).toBe(false);
    expect(settings.hooks.PostToolUse[0].matcher).toBe("Edit|Write");
    expect(settings.hooks.PostToolUse[0].hooks[0].args[0]).toBe("${CLAUDE_PROJECT_DIR}/.claude/hooks/formatar.mjs");
  });

  it("hooks por stack: Node, Python ou só as permissões", () => {
    expect(hooksFor(profile("node-ts")).files.map((f) => f.path)).toEqual([
      ".claude/settings.json",
      ".claude/hooks/formatar.mjs",
      ".claude/hooks/verificar-tipos.mjs",
    ]);
    expect(hooksFor(profile("python")).files.map((f) => f.path)).toEqual([".claude/settings.json", ".claude/hooks/formatar.py"]);
    const none = hooksFor([]);
    expect(none.files.map((f) => f.path)).toEqual([".claude/settings.json"]);
    expect(JSON.parse(none.files[0].content).hooks).toBeUndefined();
  });

  it("entra no kit e é explicado no LEIA-ME", () => {
    const saas = saasInfoSchema.parse({ name: "App", description: "Agenda online feita em Next.js", model: "B2B", stack: ["Next.js"] });
    const files = buildKitFiles(baseKitInput("existente", saas, { agents: [], skills: [], mcps: [] }));
    expect(files.some((f) => f.path === ".claude/settings.json")).toBe(true);
    const leia = files.find((f) => f.path === "LEIA-ME.md")!.content;
    expect(leia).toContain("Proteções e automações");
    expect(leia).toContain("tsc --noEmit");
    expect(detectStacks(saas).map((s) => s.id)).toEqual(["node-ts"]);
  });
});

describe("scripts dos hooks (executados de verdade)", () => {
  // Projeto temporário dentro do repositório (test-results é ignorado pelo git),
  // para o TypeScript do Lume ser encontrado subindo as pastas.
  const dir = resolve("test-results/hook-proj");
  const { files } = hooksFor(profile("node-ts"));
  const run = (script: string, input: unknown) =>
    spawnSync(process.execPath, [join(dir, ".claude/hooks", script)], {
      input: JSON.stringify(input),
      encoding: "utf8",
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
      timeout: 120000,
    });

  beforeAll(() => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, ".claude/hooks"), { recursive: true });
    for (const f of files.filter((x) => x.path.startsWith(".claude/hooks/"))) writeFileSync(join(dir, f.path), f.content);
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "hook-proj", private: true }));
    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, include: ["*.ts"] }));
    writeFileSync(join(dir, "app.ts"), "const n: number = 'texto';\nexport {};\n");
    execFileSync("git", ["init", "-q"], { cwd: dir });
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("typecheck com erro: pede correção ao Claude (decision block)", () => {
    const r = run("verificar-tipos.mjs", { hook_event_name: "Stop", stop_hook_active: false });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.decision).toBe("block");
    expect(out.reason).toContain("TS2322");
  }, 120000);

  it("não bloqueia de novo quando o Claude já está continuando por causa do hook", () => {
    const r = run("verificar-tipos.mjs", { hook_event_name: "Stop", stop_hook_active: true });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });

  it("typecheck limpo: deixa o Claude terminar", () => {
    writeFileSync(join(dir, "app.ts"), "const n: number = 1;\nexport { n };\n");
    const r = run("verificar-tipos.mjs", { hook_event_name: "Stop", stop_hook_active: false });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  }, 120000);

  it("formatar sem Prettier instalado não quebra nem bloqueia", () => {
    const r = run("formatar.mjs", { tool_name: "Edit", tool_input: { file_path: join(dir, "app.ts") } });
    expect(r.status).toBe(0);
    expect(r.stderr).toBe("");
  });
});
