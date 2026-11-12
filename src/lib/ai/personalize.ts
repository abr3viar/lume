import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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
import { getClient, models } from "./client";
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

export async function personalize(
  req: PersonalizeRequest,
  signal?: AbortSignal,
): Promise<AgentPersonalization | SkillPersonalization | ContextPersonalization> {
  const client = getClient();
  const { fast } = models();
  const saasBlock = saasInfoBlock(req.saas, req.mode);

  if (req.kind === "agent") {
    const agent = agentById.get(req.id);
    if (!agent) throw new PersonalizationRejected("Agente inexistente");
    const res = await client.messages.parse(
      {
        model: fast,
        max_tokens: 8000,
        system: PERSONALIZE_SYSTEM,
        output_config: { effort: "low", format: zodOutputFormat(agentPersonalizationSchema) },
        messages: [
          {
            role: "user",
            content: `${saasBlock}

# Template do agente "${agent.name}" (${agent.id})
Descrição atual (quando usar): ${agent.whenToUse}

${agent.systemPrompt}

# Tarefa
Devolva:
- "description": uma frase acionável dizendo QUANDO o Claude deve usar este agente, adaptada a este SaaS (até 250 caracteres).
- "prompt": o system prompt adaptado em Markdown, mantendo exatamente estas seções e títulos, nesta ordem: ${AGENT_HEADINGS.join(", ")}.`,
          },
        ],
      },
      { signal },
    );
    if (!res.parsed_output) throw new PersonalizationRejected("Saída vazia");
    return validateAgentOutput(res.parsed_output, agent.systemPrompt);
  }

  if (req.kind === "skill") {
    const skill = skillById.get(req.id);
    if (!skill) throw new PersonalizationRejected("Skill inexistente");
    const files = skill.files.map((f) => f.path);
    const res = await client.messages.parse(
      {
        model: fast,
        max_tokens: 8000,
        system: PERSONALIZE_SYSTEM,
        output_config: { effort: "low", format: zodOutputFormat(skillPersonalizationSchema) },
        messages: [
          {
            role: "user",
            content: `${saasBlock}

# Template da skill "${skill.name}" (${skill.id})
Description atual (frontmatter): ${skill.description}

Corpo do SKILL.md:
${skill.body}

# Tarefa
Devolva:
- "description": o que a skill faz e QUANDO ativar, com gatilhos concretos para este SaaS (até 500 caracteres).
- "body": o corpo do SKILL.md adaptado, em Markdown, sem frontmatter.${files.length ? ` Mantenha os links para os arquivos auxiliares exatamente assim: ${files.map((f) => `(${f})`).join(", ")}.` : ""}`,
          },
        ],
      },
      { signal },
    );
    if (!res.parsed_output) throw new PersonalizationRejected("Saída vazia");
    return validateSkillOutput(res.parsed_output, skill.body, files);
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
  const res = await client.messages.parse(
    {
      model: fast,
      max_tokens: 6000,
      system: CONTEXT_SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(contextPersonalizationSchema) },
      messages: [
        {
          role: "user",
          content: `${saasBlock}

# Itens do kit
tipo | id | nome | descrição
${items}

# Tarefa
Devolva:
- "summary": 2 a 4 frases resumindo o SaaS e como o kit ajuda agora, para o CLAUDE.md.
- "focus": de 2 a 4 focos de trabalho para o momento, ligados ao objetivo e ao estágio.
- "usage": para CADA item da lista, {"id", "whenToUse" (uma frase específica para este SaaS), "example" (um pedido que a pessoa digitaria no Claude Code)}.`,
        },
      ],
    },
    { signal },
  );
  if (!res.parsed_output) throw new PersonalizationRejected("Saída vazia");
  const out = res.parsed_output;
  const known = new Set(req.items.map((i) => i.id));
  const text = JSON.stringify(out);
  if (findSecrets(text).length) throw new PersonalizationRejected("Conteúdo suspeito");
  return { ...out, usage: out.usage.filter((u) => known.has(u.id)) };
}
