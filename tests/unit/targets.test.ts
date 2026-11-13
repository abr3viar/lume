import { describe, expect, it } from "vitest";
import { mcps } from "@/data/catalog";
import { baseKitInput, buildKitFiles, type KitFile } from "@/lib/kit/build";
import { parseFrontmatter } from "@/lib/kit/frontmatter";
import { LUME_SKILL_ID } from "@/lib/kit/lume-skill";
import { findSecrets } from "@/lib/kit/secrets";
import { codexMcpToml, grokMcpToml, retarget, TARGET_IDS, TARGETS, type KitTarget } from "@/lib/kit/targets";
import { isSafeZipPath } from "@/lib/slug";
import { ids, saasExisting } from "./fixtures";

const NOW = new Date("2026-11-12T12:00:00Z");
const allMcps = { ...ids, mcps: mcps.map((m) => m.id) };
const build = (target: KitTarget, mode: "existente" | "zero" | "erro" = "existente") => {
  const input = baseKitInput(mode, mode === "erro" ? { ...saasExisting, task: "O botão de salvar dá erro 500 no cadastro." } : saasExisting, allMcps, NOW);
  input.target = target;
  return buildKitFiles(input);
};
const get = (fs: KitFile[], p: string) => fs.find((f) => f.path === p);

/** Valida o subconjunto de TOML que geramos: tabelas, chaves e valores string/array/tabela inline. */
function looksLikeToml(text: string) {
  for (const line of text.split("\n")) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    expect(l).toMatch(/^(\[[\w.-]+\]|[\w-]+ = (".*"|\[.*\]|\{.*\}|true|false))$/);
  }
}

describe("kit para outras IAs", () => {
  it.each(TARGET_IDS)("%s: arquivo de instruções, método Lume, caminhos seguros e sem segredos", (target) => {
    const t = TARGETS[target];
    const fs = build(target);
    expect(get(fs, t.instructions)).toBeDefined();
    expect(fs.some((f) => f.path === `${t.skillsDir}${LUME_SKILL_ID}/SKILL.md`)).toBe(true);
    for (const f of fs) {
      expect(isSafeZipPath(f.path), f.path).toBe(true);
      expect(findSecrets(f.content), f.path).toEqual([]);
    }
    if (target !== "claude-code") {
      // Nada de arquivos do Claude Code fora do formato dele.
      expect(fs.filter((f) => f.path.startsWith(".claude/") || f.path === ".mcp.json" || f.path === "CLAUDE.md")).toEqual([]);
      for (const p of [t.instructions, "PROMPT-DE-ATIVACAO.md", ".env.example"]) {
        expect(get(fs, p)!.content, p).not.toMatch(/Claude Code|CLAUDE\.md|\.claude\//);
      }
    }
  });

  it("Codex: subagentes em TOML, skills em .agents/skills e MCP com variáveis por nome", () => {
    const fs = build("codex");
    const agent = fs.find((f) => f.path.startsWith(".codex/agents/"))!;
    looksLikeToml(agent.content);
    expect(agent.content).toMatch(/^name = /m);
    expect(agent.content).toMatch(/^developer_instructions = /m);
    expect(fs.some((f) => f.path.startsWith(".agents/skills/") && f.path.endsWith("SKILL.md"))).toBe(true);
    const cfg = get(fs, ".codex/config.toml")!.content;
    looksLikeToml(cfg);
    expect(cfg).toContain('bearer_token_env_var = "GITHUB_PERSONAL_ACCESS_TOKEN"');
    expect(cfg).not.toContain("${"); // o Codex não expande ${VAR}
    expect(cfg).not.toContain("CLAUDE_PROJECT_DIR");
  });

  it("Grok: MCP com ${VAR} e skills em .grok/skills", () => {
    const toml = grokMcpToml(mcps);
    looksLikeToml(toml);
    expect(toml).toContain('Authorization = "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"');
    const fs = build("grok");
    expect(fs.some((f) => f.path.startsWith(".grok/skills/"))).toBe(true);
    expect(fs.some((f) => f.path.startsWith("agentes/"))).toBe(true);
  });

  it("Gemini: settings.json válido e comandos /agente e /skill", () => {
    const fs = build("gemini");
    const settings = JSON.parse(get(fs, ".gemini/settings.json")!.content);
    const github = settings.mcpServers.github;
    expect(github.httpUrl).toMatch(/^https:/);
    const cmd = fs.find((f) => f.path.startsWith(".gemini/commands/agente/"))!;
    looksLikeToml(cmd.content);
    expect(cmd.content).toContain("{{args}}");
    expect(fs.some((f) => f.path === `.gemini/commands/skill/${LUME_SKILL_ID}.toml`)).toBe(true);
  });

  it("Cursor: regras .mdc com frontmatter e o método Lume sempre ligado", () => {
    const fs = build("cursor");
    const rule = get(fs, `.cursor/rules/${LUME_SKILL_ID}.mdc`)!;
    const fm = parseFrontmatter(rule.content)!;
    expect(fm.data.alwaysApply).toBe("true");
    expect(fm.data.description.length).toBeGreaterThan(20);
    expect(fs.some((f) => /^\.cursor\/rules\/agente-.+\.mdc$/.test(f.path))).toBe(true);
    expect(JSON.parse(get(fs, "mcp-servidores.json")!.content).mcpServers).toBeDefined();
  });

  it("modo conserto continua com TAREFA.md e a marca do modo em qualquer ferramenta", () => {
    for (const target of TARGET_IDS) {
      const fs = build(target, "erro");
      expect(get(fs, "TAREFA.md"), target).toBeDefined();
      expect(get(fs, TARGETS[target].instructions)!.content).toContain("MODO CONSERTO ATIVO");
    }
  });

  it("codexMcpToml não deixa ${VAR} solto e retarget troca as menções", () => {
    expect(codexMcpToml(mcps)).not.toMatch(/\$\{/);
    expect(retarget("Abra o Claude Code e leia o CLAUDE.md. O Claude vai perguntar.", TARGETS.codex)).toBe(
      "Abra o Codex e leia o AGENTS.md. A IA vai perguntar.",
    );
  });
});
