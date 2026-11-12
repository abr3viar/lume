import { z } from "zod";

export const MAX_FIELD = 2000;

/** Remove caracteres de controle (mantém quebras de linha) e espaços nas pontas. */
export function sanitizeText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

const text = (label: string, min = 0) =>
  z
    .string({ error: `${label} precisa ser um texto.` })
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .max(MAX_FIELD, `${label} pode ter no máximo ${MAX_FIELD} caracteres.`)
        .min(min, min > 0 ? `${label} precisa ter pelo menos ${min} caracteres.` : undefined),
    );

/**
 * Modos de uso do kit:
 * - existente: adaptar o kit a um projeto que já tem código;
 * - zero: começar o SaaS do zero (Modo Descoberta);
 * - erro: consertar um erro específico (Modo Conserto);
 * - ajuste: fazer uma atualização curta e pontual (Modo Ajuste Rápido).
 */
export const modeSchema = z.enum(["existente", "zero", "erro", "ajuste"]);
export type Mode = z.infer<typeof modeSchema>;

/** Modos de tarefa pontual: kit enxuto, focado em uma tarefa descrita pela pessoa. */
export function isTaskMode(mode: Mode | null | undefined): mode is "erro" | "ajuste" {
  return mode === "erro" || mode === "ajuste";
}

export const MODE_LABEL: Record<Mode, string> = {
  existente: "Projeto existente",
  zero: "Começar do zero",
  erro: "Consertar um erro",
  ajuste: "Atualização rápida",
};

export const businessModelSchema = z.enum(["B2B", "B2C", "B2B2C"], {
  error: "Escolha o modelo do seu SaaS.",
});
export const saasStageSchema = z.enum(["ideia", "mvp", "primeiros-clientes", "crescimento"], {
  error: "Escolha o estágio do seu SaaS.",
});
export const techLevelSchema = z.enum(["iniciante", "intermediario", "avancado"], {
  error: "Escolha o nível técnico de quem vai usar o kit.",
});

export type BusinessModel = z.infer<typeof businessModelSchema>;
export type SaasStage = z.infer<typeof saasStageSchema>;
export type TechLevel = z.infer<typeof techLevelSchema>;

export const STAGE_LABEL: Record<SaasStage, string> = {
  ideia: "Ideia",
  mvp: "MVP",
  "primeiros-clientes": "Primeiros clientes",
  crescimento: "Crescimento",
};
export const TECH_LABEL: Record<TechLevel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

/** Campos do formulário "Sobre o SaaS". Opcionalidade depende do modo (ver `saasInfoSchemaFor`). */
const baseShape = {
  name: text("O nome", 2).pipe(z.string().max(80, "O nome pode ter no máximo 80 caracteres.")),
  description: text("A descrição").default(""),
  niche: text("O nicho").default(""),
  problem: text("O problema").default(""),
  model: businessModelSchema.optional(),
  stage: saasStageSchema.optional(),
  stack: z.array(text("Item da stack").pipe(z.string().max(40))).max(20).default([]),
  goal: text("O objetivo").default(""),
  techLevel: techLevelSchema.optional(),
  /** Modos erro/ajuste: o que está quebrado ou o que mudar. */
  task: text("A tarefa").default(""),
  /** Modos erro/ajuste: passos para reproduzir, mensagem de erro, onde fica no código. */
  details: text("Os detalhes").default(""),
};

export const saasInfoSchema = z.object(baseShape);
export type SaasInfo = z.output<typeof saasInfoSchema>;
export type SaasInfoInput = z.input<typeof saasInfoSchema>;

/**
 * Obrigatórios por modo:
 * - existente e zero: nome, descrição e modelo (o resto é opcional e melhora as sugestões);
 * - erro/ajuste: nome do projeto e a tarefa (o resto é opcional).
 */
export function saasInfoSchemaFor(mode: Mode) {
  return saasInfoSchema.superRefine((v, ctx) => {
    if (isTaskMode(mode)) {
      if (v.task.length < 10) {
        ctx.addIssue({
          code: "custom",
          path: ["task"],
          message: mode === "erro" ? "Descreva o erro em pelo menos 10 caracteres." : "Descreva a mudança em pelo menos 10 caracteres.",
        });
      }
      return;
    }
    if (v.description.length < 10)
      ctx.addIssue({ code: "custom", path: ["description"], message: "A descrição precisa ter pelo menos 10 caracteres." });
    if (!v.model) ctx.addIssue({ code: "custom", path: ["model"], message: "Escolha o modelo do seu SaaS." });

  });
}

export const itemKindSchema = z.enum(["agent", "skill", "mcp"]);
export const impactSchema = z.enum(["alto", "médio"]);

export const recommendationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,64}$/),
  reason: z.string().transform(sanitizeText).pipe(z.string().min(10).max(400)),
  impact: impactSchema,
});
export type Recommendation = z.infer<typeof recommendationSchema>;

export const recommendRequestSchema = z.object({
  mode: modeSchema,
  saas: saasInfoSchema,
  kinds: z.array(itemKindSchema).min(1).max(3).default(["agent", "skill", "mcp"]),
  more: z.boolean().default(false),
  excludeIds: z
    .object({
      agent: z.array(z.string().max(64)).max(80).default([]),
      skill: z.array(z.string().max(64)).max(80).default([]),
      mcp: z.array(z.string().max(64)).max(80).default([]),
    })
    .default({ agent: [], skill: [], mcp: [] }),
});
export type RecommendRequest = z.infer<typeof recommendRequestSchema>;

export const personalizeRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent"), id: z.string().max(64), mode: modeSchema, saas: saasInfoSchema }),
  z.object({ kind: z.literal("skill"), id: z.string().max(64), mode: modeSchema, saas: saasInfoSchema }),
  z.object({
    kind: z.literal("context"),
    mode: modeSchema,
    saas: saasInfoSchema,
    items: z.array(z.object({ kind: itemKindSchema, id: z.string().max(64) })).max(80),
  }),
]);
export type PersonalizeRequest = z.infer<typeof personalizeRequestSchema>;

/** Saídas da IA na personalização (validadas antes de usar). */
export const agentPersonalizationSchema = z.object({
  description: z.string().min(20).max(300),
  prompt: z.string().min(400).max(12000),
});
export const skillPersonalizationSchema = z.object({
  description: z.string().min(40).max(600),
  body: z.string().min(300).max(12000),
});
export const contextPersonalizationSchema = z.object({
  summary: z.string().min(40).max(1200),
  focus: z.array(z.string().min(5).max(200)).min(1).max(5),
  usage: z
    .array(z.object({ id: z.string(), whenToUse: z.string().min(10).max(300), example: z.string().min(5).max(200) }))
    .max(80),
});
export type AgentPersonalization = z.infer<typeof agentPersonalizationSchema>;
export type SkillPersonalization = z.infer<typeof skillPersonalizationSchema>;
export type ContextPersonalization = z.infer<typeof contextPersonalizationSchema>;
