import { z } from "zod";

export const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const audienceSchema = z.enum(["B2B", "B2C", "ambos"]);
export const stageSchema = z.enum(["ideia", "mvp", "primeiros-clientes", "crescimento"]);
export const effortSchema = z.enum(["fácil", "médio", "avançado"]);
export const riskSchema = z.enum(["leitura", "escrita", "amplo"]);

export type Audience = z.infer<typeof audienceSchema>;
export type Stage = z.infer<typeof stageSchema>;
export type Effort = z.infer<typeof effortSchema>;
export type Risk = z.infer<typeof riskSchema>;

export const ALL_STAGES: Stage[] = ["ideia", "mvp", "primeiros-clientes", "crescimento"];

/** Ferramentas internas do Claude Code que um subagent pode receber. */
export const CLAUDE_TOOLS = [
  "Read",
  "Grep",
  "Glob",
  "Edit",
  "Write",
  "Bash",
  "WebFetch",
  "WebSearch",
] as const;

const promptSchema = z.object({
  role: z.string().min(40),
  goal: z.string().min(40),
  steps: z.array(z.string().min(15)).min(5),
  output: z.array(z.string().min(10)).min(3),
  rules: z.array(z.string().min(15)).min(4),
  done: z.string().min(30),
});

export const agentSchema = z.object({
  id: z.string().regex(KEBAB).max(64),
  name: z.string().min(3).max(60),
  category: z.string().min(3),
  description: z.string().min(40).max(300),
  whenToUse: z.string().min(20).max(300),
  example: z.string().min(10).max(200),
  tags: z.array(z.string()).min(2),
  appliesTo: audienceSchema,
  stages: z.array(stageSchema).min(1),
  tools: z.array(z.enum(CLAUDE_TOOLS)).min(1),
  effort: effortSchema,
  foundation: z.boolean().default(false),
  overlapsWith: z.array(z.string()).default([]),
  prompt: promptSchema,
});

export const skillFileSchema = z.object({
  path: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*\.(md|txt|json)$/),
  content: z.string().min(40),
});

export const skillSchema = z.object({
  id: z.string().regex(KEBAB).max(64),
  name: z.string().min(3).max(60),
  category: z.string().min(3),
  /** Vai para o frontmatter: diz o que faz e QUANDO ativar. */
  description: z.string().min(60).max(600),
  summary: z.string().min(20).max(200),
  example: z.string().min(10).max(200),
  tags: z.array(z.string()).min(2),
  appliesTo: audienceSchema,
  stages: z.array(stageSchema).min(1),
  effort: effortSchema,
  overlapsWith: z.array(z.string()).default([]),
  body: z.string().min(450),
  files: z.array(skillFileSchema).default([]),
}).superRefine((s, ctx) => {
  // Conteúdo total da skill (SKILL.md + arquivos auxiliares) precisa ser substancial.
  const total = s.body.length + (s.files ?? []).reduce((n, f) => n + f.content.length, 0);
  if (total < 800) ctx.addIssue({ code: "custom", message: `${s.id}: conteúdo total curto (${total} caracteres)` });
  // Todo arquivo auxiliar precisa ser referenciado no SKILL.md.
  for (const f of s.files ?? []) {
    if (!s.body.includes(`(${f.path})`)) {
      ctx.addIssue({ code: "custom", message: `${s.id}: arquivo ${f.path} não é referenciado no corpo` });
    }
  }
});

const envVarSchema = z.object({
  name: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  description: z.string().min(10),
  whereToGet: z.string().url(),
});

const stdioConfig = z
  .object({
    command: z.string().min(1),
    args: z.array(z.string()),
    env: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const httpConfig = z
  .object({
    type: z.literal("http"),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export const mcpSchema = z
  .object({
    id: z.string().regex(KEBAB).max(64),
    name: z.string().min(2),
    purpose: z.string().min(30).max(240),
    capabilities: z.array(z.string().min(5)).min(2),
    category: z.string().min(3),
    transport: z.enum(["stdio", "http"]),
    auth: z.enum(["oauth", "token", "nenhuma"]),
    config: z.union([stdioConfig, httpConfig]),
    requiredEnvVars: z.array(envVarSchema).default([]),
    requirements: z.array(z.string()).default([]),
    riskLevel: riskSchema,
    riskNote: z.string().min(10),
    setupNotes: z.array(z.string()).default([]),
    example: z.string().min(10).max(200),
    docsUrl: z.string().url(),
    verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    appliesTo: audienceSchema,
    stages: z.array(stageSchema).min(1),
    effort: effortSchema,
    tags: z.array(z.string()).min(2),
    overlapsWith: z.array(z.string()).default([]),
  })
  .superRefine((m, ctx) => {
    const isHttp = "type" in m.config;
    if (isHttp !== (m.transport === "http")) {
      ctx.addIssue({ code: "custom", message: `${m.id}: transport não bate com config` });
    }
    // Nenhum segredo literal: valores de header/env precisam ser ${VAR}.
    const values = [
      ...Object.values(("headers" in m.config && m.config.headers) || {}),
      ...Object.values(("env" in m.config && m.config.env) || {}),
    ];
    for (const v of values) {
      if (!/\$\{[A-Z][A-Z0-9_]*(:-[^}]*)?\}/.test(v)) {
        ctx.addIssue({ code: "custom", message: `${m.id}: valor sem placeholder \${VAR}: ${v}` });
      }
    }
    for (const ref of JSON.stringify(m.config).matchAll(/\$\{([A-Z][A-Z0-9_]*)(?::-[^}]*)?\}/g)) {
      const name = ref[1];
      if (name === "CLAUDE_PROJECT_DIR") continue;
      if (!m.requiredEnvVars.some((e) => e.name === name)) {
        ctx.addIssue({ code: "custom", message: `${m.id}: ${name} não está em requiredEnvVars` });
      }
    }
  });

export const presetSchema = z.object({
  id: z.string().regex(KEBAB),
  name: z.string().min(3),
  description: z.string().min(20),
  appliesTo: audienceSchema,
  agents: z.array(z.string()).min(1),
  skills: z.array(z.string()).min(1),
  mcps: z.array(z.string()),
  /** Modos em que o kit aparece. Sem o campo, aparece em todos. */
  modes: z.array(z.enum(["existente", "zero", "erro", "ajuste"])).optional(),
});

export type AgentInput = z.input<typeof agentSchema>;
export type Agent = z.output<typeof agentSchema>;
export type SkillInput = z.input<typeof skillSchema>;
export type Skill = z.output<typeof skillSchema>;
export type McpInput = z.input<typeof mcpSchema>;
export type Mcp = z.output<typeof mcpSchema>;
export type Preset = z.infer<typeof presetSchema>;

export type ItemKind = "agent" | "skill" | "mcp";
