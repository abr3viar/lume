import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { agentById, mcpById } from "@/data/catalog";
import { baseKitInput, buildKitFiles, DISCOVERY_MARK, kitRoot, type KitFile } from "@/lib/kit/build";
import { parseFrontmatter } from "@/lib/kit/frontmatter";
import { findSecrets } from "@/lib/kit/secrets";
import { buildZip } from "@/lib/kit/zip";
import { ids, saasExisting, saasZero } from "./fixtures";

const NOW = new Date("2026-11-12T12:00:00Z");
const files = (mode: "existente" | "zero", saas = mode === "zero" ? saasZero : saasExisting, sel = ids) =>
  buildKitFiles(baseKitInput(mode, saas, sel, NOW));
const get = (fs: KitFile[], path: string) => fs.find((f) => f.path === path);

/**
 * Formato do .mcp.json documentado em https://code.claude.com/docs/en/mcp:
 * chave "mcpServers"; remotos com "type": "http" e "url" (e "headers" opcionais);
 * locais com "command", "args" e "env" opcionais.
 */
const documentedMcpJson = z
  .object({
    mcpServers: z.record(
      z.string().regex(/^[a-z0-9-]+$/),
      z.union([
        z.object({ type: z.literal("http"), url: z.string().url(), headers: z.record(z.string(), z.string()).optional() }).strict(),
        z.object({ command: z.string().min(1), args: z.array(z.string()), env: z.record(z.string(), z.string()).optional() }).strict(),
      ]),
    ),
  })
  .strict();

describe("estrutura do kit", () => {
  it("modo projeto existente: arquivos esperados, sem BRIEFING", () => {
    const fs = files("existente");
    const paths = fs.map((f) => f.path).sort();
    expect(paths).toEqual(
      [
        // Stack Next.js: proteções e hooks de formatação e typecheck.
        ".claude/settings.json",
        "lume-kit.json",
        ".claude/hooks/formatar.mjs",
        ".claude/hooks/verificar-tipos.mjs",
        ".claude/agents/arquiteto-produto.md",
        ".claude/agents/revisor-codigo.md",
        ".claude/agents/suporte-cliente.md",
        ".claude/agents/termos-privacidade-lgpd.md",
        ".claude/skills/brief-do-projeto/SKILL.md",
        ".claude/skills/checklist-lgpd/SKILL.md",
        ".claude/skills/checklist-lgpd/checklist.md",
        ".claude/skills/escrever-prd/SKILL.md",
        ".claude/skills/escrever-prd/template-prd.md",
        ".claude/skills/metodo-lume/SKILL.md",
        ".claude/skills/metodo-lume/modelo-progresso.md",
        ".env.example",
        ".mcp.json",
        "CLAUDE.md",
        "LEIA-ME.md",
        "PROMPT-DE-ATIVACAO.md",
      ].sort(),
    );
  });

  it("modo do zero inclui BRIEFING.md", () => {
    expect(get(files("zero"), "BRIEFING.md")).toBeDefined();
  });

  it("sem MCPs no carrinho não gera .mcp.json nem .env.example", () => {
    const fs = files("existente", saasExisting, { ...ids, mcps: [] });
    expect(get(fs, ".mcp.json")).toBeUndefined();
    expect(get(fs, ".env.example")).toBeUndefined();
  });

  it("cabeçalhos dos arquivos centrais citam o Lume", () => {
    const fs = files("existente");
    for (const p of ["CLAUDE.md", "LEIA-ME.md", "PROMPT-DE-ATIVACAO.md"]) {
      expect(get(fs, p)!.content.split("\n").slice(0, 4).join("\n"), p).toContain("Kit gerado pelo Lume");
    }
  });
});

describe("frontmatter de agentes e skills", () => {
  it("agentes têm name em kebab-case, description e tools válidos", () => {
    for (const f of files("existente").filter((x) => x.path.startsWith(".claude/agents/"))) {
      const fm = parseFrontmatter(f.content);
      expect(fm, f.path).not.toBeNull();
      expect(fm!.data.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(f.path).toBe(`.claude/agents/${fm!.data.name}.md`);
      expect(fm!.data.description.length).toBeGreaterThan(20);
      const tools = fm!.data.tools.split(",").map((t) => t.trim());
      expect(tools).toEqual(agentById.get(fm!.data.name)!.tools);
      expect(fm!.body).toContain("# Papel");
      expect(fm!.body).toContain("# Critério de conclusão");
    }
  });

  it("SKILL.md tem name igual à pasta e description dizendo quando usar", () => {
    for (const f of files("existente").filter((x) => x.path.endsWith("/SKILL.md"))) {
      const fm = parseFrontmatter(f.content)!;
      expect(f.path).toBe(`.claude/skills/${fm.data.name}/SKILL.md`);
      expect(fm.data.description).toMatch(/Use (quando|ao|antes|logo)/);
    }
  });

  it("descrições com aspas e dois-pontos continuam válidas", () => {
    const input = baseKitInput("existente", saasExisting, { agents: ["suporte-cliente"], skills: [], mcps: [] }, NOW);
    input.agents[0].description = 'Use quando: o cliente diz "socorro" \\ urgente';
    const fm = parseFrontmatter(buildKitFiles(input)[0].content)!;
    expect(fm.data.description.startsWith('Use quando: o cliente diz "socorro" \\ urgente Exemplos de pedido: "')).toBe(true);
  });
});

describe(".mcp.json", () => {
  const fs = files("existente");
  const json = JSON.parse(get(fs, ".mcp.json")!.content);

  it("segue o formato documentado", () => {
    expect(documentedMcpJson.safeParse(json).success).toBe(true);
    expect(Object.keys(json.mcpServers).sort()).toEqual([...ids.mcps].sort());
  });

  it("usa ${VAR} para credenciais e nunca valores literais", () => {
    expect(json.mcpServers.github.headers.Authorization).toBe("Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}");
    for (const [id, cfg] of Object.entries<Record<string, unknown>>(json.mcpServers)) {
      const values = Object.values({ ...((cfg.headers as object) ?? {}), ...((cfg.env as object) ?? {}) }) as string[];
      for (const v of values) expect(v, id).toMatch(/\$\{[A-Z0-9_]+\}/);
    }
  });

  it("todos os MCPs do catálogo têm docsUrl e verifiedAt", () => {
    for (const id of ids.mcps) {
      const m = mcpById.get(id)!;
      expect(m.docsUrl).toMatch(/^https:\/\//);
      expect(m.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it(".env.example lista as variáveis sem valores", () => {
    const env = get(fs, ".env.example")!.content;
    expect(env).toMatch(/^GITHUB_PERSONAL_ACCESS_TOKEN=$/m);
    expect(env).toMatch(/^CONTEXT7_API_KEY=$/m);
    for (const line of env.split("\n").filter((l) => !l.startsWith("#") && l.includes("="))) {
      expect(line.split("=")[1], line).toBe("");
    }
  });
});

describe("MODO DESCOBERTA", () => {
  it("abre o CLAUDE.md no modo do zero, com as regras e o prompt próprio", () => {
    const fs = files("zero");
    const md = get(fs, "CLAUDE.md")!.content;
    const markIdx = md.indexOf(DISCOVERY_MARK);
    expect(markIdx).toBeGreaterThan(-1);
    expect(markIdx).toBeLessThan(md.indexOf("## Contexto do SaaS"));
    expect(md).toContain("blocos de no máximo 4");
    expect(md).toContain("BRIEFING.md");
    expect(md).toContain("remova este bloco");
    expect(get(fs, "PROMPT-DE-ATIVACAO.md")!.content).toContain("MODO DESCOBERTA está ativo");
  });

  it("não aparece no modo projeto existente", () => {
    const fs = files("existente");
    for (const f of fs) expect(f.content, f.path).not.toContain(DISCOVERY_MARK);
    expect(get(fs, "PROMPT-DE-ATIVACAO.md")!.content).toContain("Analise o código");
  });

  it("BRIEFING vem pré-preenchido e marcado como a confirmar", () => {
    const b = get(files("zero"), "BRIEFING.md")!.content;
    expect(b).toContain("Treino em Casa");
    expect(b).toContain("(a confirmar)");
    expect(b).toContain("_a preencher_");
  });
});

describe("LEIA-ME", () => {
  it("se ajusta ao nível técnico", () => {
    const iniciante = get(files("existente", { ...saasExisting, techLevel: "iniciante" }), "LEIA-ME.md")!.content;
    const avancado = get(files("existente", { ...saasExisting, techLevel: "avancado" }), "LEIA-ME.md")!.content;
    expect(iniciante).toContain("terminal-guide");
    expect(avancado).not.toContain("terminal-guide");
    expect(iniciante.length).toBeGreaterThan(avancado.length);
  });

  it("tem as 14 seções e aponta para a documentação oficial", () => {
    const md = get(files("existente"), "LEIA-ME.md")!.content;
    for (let i = 1; i <= 14; i++) expect(md).toContain(`## ${i}. `);
    expect(md).toContain("https://code.claude.com/docs/en/setup");
    expect(md).toContain(`${kitRoot(saasExisting)}/`);
  });

  it("registra itens que não foram personalizados", () => {
    const input = baseKitInput("existente", saasExisting, ids, NOW);
    input.personalizationAttempted = true;
    input.agents[0].personalized = true;
    const md = get(buildKitFiles(input), "LEIA-ME.md")!.content;
    expect(md).toContain("não puderam ser personalizados");
    expect(md).toContain("Revisor de código");
  });
});

describe("zip", () => {
  it("abre sem erro, com a pasta raiz e todos os arquivos", async () => {
    const fs = files("zero");
    const root = kitRoot(saasZero);
    const bytes = await buildZip(fs, root);
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    expect(names.sort()).toEqual(fs.map((f) => `${root}/${f.path}`).sort());
    const claude = await zip.file(`${root}/CLAUDE.md`)!.async("string");
    expect(claude).toContain(DISCOVERY_MARK);
  });

  it("não contém nada com cara de segredo", async () => {
    const fs = files("existente");
    for (const f of fs) expect(findSecrets(f.content), f.path).toEqual([]);
  });

  it("remove segredos que escapem para o conteúdo", () => {
    const input = baseKitInput("existente", saasExisting, { agents: ["suporte-cliente"], skills: [], mcps: [] }, NOW);
    input.agents[0].prompt += "\nchave: ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    const out = buildKitFiles(input).find((f) => f.path.startsWith(".claude/agents/"))!;
    expect(out.content).not.toContain("ghp_abcdef");
    expect(out.content).toContain("[REMOVIDO]");
  });

  it("recusa raiz insegura", async () => {
    await expect(buildZip([], "../fora")).rejects.toThrow();
  });
});
