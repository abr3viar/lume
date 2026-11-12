import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { agentById, mcpById, skillById } from "@/data/catalog";
import { findSecrets } from "@/lib/kit/secrets";
import {
  agentPersonalizationSchema,
  contextPersonalizationSchema,
  skillPersonalizationSchema,
  type AgentPersonalization,
  type ContextPersonalization,
  type PersonalizeRequest,
  type SkillPersonalization,
} from "@/lib/schemas";
import { claudeCodeEnabled, claudeCodeModels, runClaudeCode } from "./claude-code";
import { getClient, models } from "./client";
import { safeParseJson } from "./parse";
import { CONTEXT_SYSTEM, PERSONALIZE_SYSTEM, saasInfoBlock } from "./prompts";

export class PersonalizationRejected extends Error {}

const AGENT_HEADINGS = ["# Papel", "# Objetivo", "# Passo a passo", "# Formato de saída", "# Regras e limites", "# Critério de conclusão"];

/** Garante que a adaptação manteve estrutura, tamanho e não trouxe segredos. */
export function validateAgentOutput(out: AgentPersonalization, template: string): AgentPersonalization {
  for (const h of AGENT_HEADINGS) {
    if (!out.prompt.includes(h)) throw new PersonalizationRejected(`Seção ausente: ${h}`);
  }
  if (out.prompt.length < template.length * 0.6) throw new PersonalizationRejected("Prompt encurtado demais");
  if (findSecrets(out.prompt + out.description).length) throw new PersonalizationRejected("Conteúdo suspeito");
  return { description: out.description.replace(/\s+/g, " ").trim(), prompt: out.prompt.trim() };
}

export function validateSkillOutput(out: SkillPersonalization, template: string, files: string[]): SkillPersonalization {
  for (const f of files) {
    if (!out.body.includes(`(${f})`)) throw new PersonalizationRejected(`Referência perdida: ${f}`);
  }
  if (out.body.length < template.length * 0.6) throw new PersonalizationRejected("Skill encurtada demais");
  if (findSecrets(out.body + out.description).length) throw new PersonalizationRejected("Conteúdo suspeito");
  return { description: out.description.replace(/\s+/g, " ").trim(), body: out.body.trim() };
}

type Job<T> = { system: string; user: string; schema: z.ZodType<T>; maxTokens: number; finish: (out: T) => T };

/** Executa o pedido pela API (saída estruturada) ou pelo Claude Code local (JSON validado com zod). */
async function execute<T>(job: Job<T>, signal?: AbortSignal): Promise<T> {
  if (claudeCodeEnabled()) {
    const text = await runClaudeCode({
      system: `${job.system}\n\nResponda APENAS com um objeto JSON válido, sem texto antes ou depois e sem cercas de código.`,
      prompt: job.user,
      model: claudeCodeModels().fast,
      signal,
    });
    const parsed = job.schema.safeParse(safeParseJson(text));
    if (!parsed.success) throw new PersonalizationRejected("JSON inválido do Claude Code");
    return job.finish(parsed.data);
  }
  const res = await getClient().messages.parse(
    {
      model: models().fast,
      max_tokens: job.maxTokens,
      system: job.system,
      output_config: { effort: "low", format: zodOutputFormat(job.schema) },
      messages: [{ role: "user", content: job.user }],
    },
    { signal },
  );
  if (!res.parsed_output) throw new PersonalizationRejected("Saída vazia");
  return job.finish(res.parsed_output as T);
}

export async function personalize(
  req: PersonalizeRequest,
  signal?: AbortSignal,
): Promise<AgentPersonalization | SkillPersonalization | ContextPersonalization> {
  const saasBlock = saasInfoBlock(req.saas, req.mode);

  if (req.kind === "agent") {
    const agent = agentById.get(req.id);
    if (!agent) throw new PersonalizationRejected("Agente inexistente");
    return execute(
      {
        system: PERSONALIZE_SYSTEM,
        schema: agentPersonalizationSchema,
        maxTokens: 8000,
        finish: (out) => validateAgentOutput(out, agent.systemPrompt),
        user: `${saasBlock}

# Template do agente "${agent.name}" (${agent.id})
Descrição atual (quando usar): ${agent.whenToUse}

${agent.systemPrompt}

# Tarefa
Devolva um JSON com:
- "description": uma frase acionável dizendo QUANDO o Claude deve usar este agente, adaptada a este SaaS (até 250 caracteres).
- "prompt": o system prompt adaptado em Markdown, mantendo exatamente estas seções e títulos, nesta ordem: ${AGENT_HEADINGS.join(", ")}.`,
      },
      signal,
    );
  }

  if (req.kind === "skill") {
    const skill = skillById.get(req.id);
    if (!skill) throw new PersonalizationRejected("Skill inexistente");
    const files = skill.files.map((f) => f.path);
    return execute(
      {
        system: PERSONALIZE_SYSTEM,
        schema: skillPersonalizationSchema,
        maxTokens: 8000,
        finish: (out) => validateSkillOutput(out, skill.body, files),
        user: `${saasBlock}

# Template da skill "${skill.name}" (${skill.id})
Description atual (frontmatter): ${skill.description}

Corpo do SKILL.md:
${skill.body}

# Tarefa
Devolva um JSON com:
- "description": o que a skill faz e QUANDO ativar, com gatilhos concretos para este SaaS (até 500 caracteres).
- "body": o corpo do SKILL.md adaptado, em Markdown, sem frontmatter.${files.length ? ` Mantenha os links para os arquivos auxiliares exatamente assim: ${files.map((f) => `(${f})`).join(", ")}.` : ""}`,
      },
      signal,
    );
  }

  // Contexto do kit: resumo, focos e "quando usar" por item.
  const items = req.items
    .map((i) => {
      const it = i.kind === "agent" ? agentById.get(i.id) : i.kind === "skill" ? skillById.get(i.id) : mcpById.get(i.id);
      if (!it) return null;
      const desc = "purpose" in it ? it.purpose : it.description;
      return `${i.kind} | ${it.id} | ${it.name} | ${desc}`;
    })
    .filter(Boolean)
    .join("\n");
  const known = new Set(req.items.map((i) => i.id));
  return execute(
    {
      system: CONTEXT_SYSTEM,
      schema: contextPersonalizationSchema,
      maxTokens: 6000,
      finish: (out) => {
        if (findSecrets(JSON.stringify(out)).length) throw new PersonalizationRejected("Conteúdo suspeito");
        return { ...out, usage: out.usage.filter((u) => known.has(u.id)) };
      },
      user: `${saasBlock}

# Itens do kit
tipo | id | nome | descrição
${items}

# Tarefa
Devolva um JSON com:
- "summary": 2 a 4 frases resumindo o SaaS e como o kit ajuda agora, para o CLAUDE.md.
- "focus": de 2 a 4 focos de trabalho para o momento, ligados ao objetivo e ao estágio.
- "usage": para CADA item da lista, {"id", "whenToUse" (uma frase específica para este SaaS), "example" (um pedido que a pessoa digitaria no Claude Code)}.`,
    },
    signal,
  );
}
