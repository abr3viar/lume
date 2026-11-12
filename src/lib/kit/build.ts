import { brand } from "@/config/brand";
import type { CatalogAgent, Mcp, Skill } from "@/data/catalog";
import { agentById, mcpById, skillById } from "@/data/catalog";
import {
  isTaskMode,
  STAGE_LABEL,
  TECH_LABEL,
  type ContextPersonalization,
  type Mode,
  type SaasInfo,
  type TechLevel,
} from "@/lib/schemas";
import { isSafeZipPath, slugify } from "@/lib/slug";
import { frontmatter, yamlString } from "./frontmatter";
import { redactSecrets } from "./secrets";
import { detectStacks } from "./stacks";
import { buildTree, renderTreeText } from "./tree";

export type KitFile = { path: string; content: string };

export type KitAgent = { item: CatalogAgent; description: string; prompt: string; personalized: boolean };
export type KitSkill = { item: Skill; description: string; body: string; personalized: boolean };

export type KitInput = {
  mode: Mode;
  saas: SaasInfo;
  agents: KitAgent[];
  skills: KitSkill[];
  mcps: Mcp[];
  context?: ContextPersonalization | null;
  /** True quando o kit passou pela personalização com IA (mesmo que algum item tenha caído no fallback). */
  personalizationAttempted?: boolean;
  generatedAt: Date;
};

export const DISCOVERY_MARK = "MODO DESCOBERTA ATIVO";
export const FIX_MARK = "MODO CONSERTO ATIVO";
export const QUICK_MARK = "MODO AJUSTE RÁPIDO ATIVO";
const RISK_LABEL: Record<Mcp["riskLevel"], string> = {
  leitura: "Somente leitura",
  escrita: "Escreve dados",
  amplo: "Acesso amplo",
};
const AUTH_LABEL: Record<Mcp["auth"], string> = {
  oauth: "Login OAuth pelo /mcp",
  token: "Token em variável de ambiente",
  nenhuma: "Nenhuma",
};

/** Kit com os templates base, sem personalização (prévia e fallback). */
export function baseKitInput(
  mode: Mode,
  saas: SaasInfo,
  ids: { agents: string[]; skills: string[]; mcps: string[] },
  generatedAt = new Date(),
): KitInput {
  return {
    mode,
    saas,
    generatedAt,
    agents: ids.agents.flatMap((id) => {
      const a = agentById.get(id);
      return a ? [{ item: a, description: a.whenToUse, prompt: a.systemPrompt, personalized: false }] : [];
    }),
    skills: ids.skills.flatMap((id) => {
      const s = skillById.get(id);
      return s ? [{ item: s, description: s.description, body: s.body, personalized: false }] : [];
    }),
    mcps: ids.mcps.flatMap((id) => {
      const m = mcpById.get(id);
      return m ? [m] : [];
    }),
  };
}

export function kitRoot(saas: SaasInfo) {
  return `${slugify(saas.name)}-kit`;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(d);
}

function tech(saas: SaasInfo): TechLevel {
  return saas.techLevel ?? "iniciante";
}

function pick<T>(level: TechLevel, v: { iniciante: T; intermediario: T; avancado: T }): T {
  return v[level];
}

function val(v: string | undefined, fallback = "_a confirmar_") {
  return v && v.trim() ? v.trim() : fallback;
}

/** Quebras de linha no texto do usuário viram espaço para não quebrar tabelas Markdown. */
function cell(v: string) {
  return v.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
}

function usageFor(input: KitInput, id: string) {
  return input.context?.usage.find((u) => u.id === id);
}

function envVars(mcps: Mcp[]) {
  const seen = new Map<string, { name: string; description: string; whereToGet: string; mcp: string }>();
  for (const m of mcps) for (const e of m.requiredEnvVars) if (!seen.has(e.name)) seen.set(e.name, { ...e, mcp: m.name });
  return [...seen.values()];
}

// ─────────────────────────── arquivos individuais ───────────────────────────

export function agentFile(a: KitAgent): KitFile {
  const fm = frontmatter({
    name: a.item.id,
    description: yamlString(a.description),
    tools: a.item.tools.join(", "),
  });
  return { path: `.claude/agents/${a.item.id}.md`, content: `${fm}\n${a.prompt.trim()}\n` };
}

export function skillFiles(s: KitSkill): KitFile[] {
  const fm = frontmatter({ name: s.item.id, description: yamlString(s.description) });
  const dir = `.claude/skills/${s.item.id}`;
  return [
    { path: `${dir}/SKILL.md`, content: `${fm}\n${s.body.trim()}\n` },
    ...s.item.files.map((f) => ({ path: `${dir}/${f.path}`, content: f.content })),
  ];
}

export function mcpJson(mcps: Mcp[]): string {
  const servers: Record<string, unknown> = {};
  for (const m of mcps) servers[m.id] = m.config;
  return `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`;
}

export function envExample(mcps: Mcp[]): string {
  const vars = envVars(mcps);
  const lines = [
    `# ${brand.generatedBy}`,
    "# Variáveis exigidas pelos MCPs do seu kit.",
    "# 1. Copie este arquivo para .env (ele já deve estar no seu .gitignore).",
    "# 2. Preencha os valores SÓ no .env, nunca neste arquivo.",
    "# 3. Carregue o .env no terminal antes de abrir o Claude Code (veja o LEIA-ME).",
    "",
  ];
  if (vars.length === 0) {
    lines.push("# Nenhum MCP do seu kit precisa de chave em arquivo.");
    lines.push("# Os servidores remotos usam login OAuth: digite /mcp dentro do Claude Code.");
  }
  for (const v of vars) {
    lines.push(`# ${v.mcp}: ${v.description}`, `# Onde obter: ${v.whereToGet}`, `${v.name}=`, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

// ─────────────────────────── CLAUDE.md ───────────────────────────

function discoveryBlock(): string {
  return `> [!IMPORTANT]
> **${DISCOVERY_MARK}. Leia antes de qualquer ação.**
>
> Este projeto ainda não existe. Antes de escrever código, criar arquivos de projeto, instalar dependências ou rodar comandos, você DEVE entrevistar o usuário sobre o SaaS. Regras:
>
> 1. Comece lendo o \`BRIEFING.md\`. O que já estiver preenchido, apenas confirme; o que estiver vazio ou marcado "a confirmar", pergunte.
> 2. Faça as perguntas em blocos de no máximo 4, esperando a resposta de cada bloco. Não despeje todas de uma vez.
> 3. Cubra no mínimo: quem é o cliente ideal e a dor principal; como ele resolve isso hoje; proposta de valor; modelo de receita e preços previstos; funcionalidades essenciais do MVP (e o que fica de fora); integrações necessárias; preferências de stack e hospedagem (se o usuário não souber, proponha opções com prós e contras); requisitos de privacidade e LGPD; prazo e orçamento; referências e concorrentes; identidade visual desejada.
> 4. Ao terminar, escreva um resumo (Brief do Projeto), atualize o \`BRIEFING.md\` e este \`CLAUDE.md\`, e PEÇA aprovação explícita.
> 5. Só depois da aprovação, proponha um plano de construção por etapas com a ordem dos agentes e skills, e execute etapa por etapa, pedindo confirmação entre elas.
> 6. Se o usuário pedir para pular a entrevista, avise dos riscos e faça ao menos as 5 perguntas essenciais: cliente, problema, MVP, stack e prazo.
> 7. Ao concluir a descoberta, remova este bloco "${DISCOVERY_MARK}" do CLAUDE.md.
`;
}

function fixBlock(): string {
  return `> [!IMPORTANT]
> **${FIX_MARK}. Leia antes de qualquer ação.**
>
> Este kit existe para consertar UM erro, descrito no \`TAREFA.md\`. Regras:
>
> 1. Leia o \`TAREFA.md\`. Se faltar informação para reproduzir o erro, pergunte antes de mexer (no máximo 4 perguntas por vez).
> 2. Reproduza o erro antes de alterar qualquer coisa: com um teste que falha, um comando ou os passos descritos. Se não conseguir reproduzir, diga o que tentou e pare.
> 3. Encontre a causa raiz e explique em poucas frases, com o arquivo e a linha. Corrija a causa, não o sintoma.
> 4. Proponha a correção mínima (quais arquivos e por quê) e PEÇA aprovação antes de editar.
> 5. Não refatore, não renomeie e não "melhore" código que não tem relação com o erro. Se notar outros problemas, só liste no final.
> 6. Depois de corrigir, escreva ou atualize um teste que impeça o erro de voltar e rode os testes do projeto.
> 7. Termine com um resumo: causa, correção, arquivos alterados, como verificar, e uma sugestão de mensagem de commit.
> 8. Nunca peça para o usuário colar senhas, tokens ou dados de clientes. Se o erro envolver dados reais, use exemplos fictícios.
> 9. Quando o erro estiver resolvido e aprovado, remova este bloco "${FIX_MARK}" do CLAUDE.md.
`;
}

function quickBlock(): string {
  return `> [!IMPORTANT]
> **${QUICK_MARK}. Leia antes de qualquer ação.**
>
> Este kit existe para UMA mudança curta, descrita no \`TAREFA.md\`. Regras:
>
> 1. Leia o \`TAREFA.md\` e localize no código exatamente onde a mudança acontece.
> 2. Se o pedido estiver ambíguo, faça no máximo 3 perguntas antes de começar.
> 3. Mostre um plano curto: quais arquivos vão mudar e o que muda em cada um. PEÇA aprovação.
> 4. Mantenha o escopo fechado: só o que foi pedido. Se a mudança crescer além de poucos arquivos, pare e avise antes de continuar.
> 5. Siga o estilo e os padrões do código ao redor. Não reformate nem refatore o resto.
> 6. Rode o lint, os testes e o build que o projeto já tiver, e corrija o que a mudança quebrar.
> 7. Termine com um resumo do que mudou, como conferir e uma sugestão de mensagem de commit.
> 8. Quando a mudança estiver concluída e aprovada, remova este bloco "${QUICK_MARK}" do CLAUDE.md.
`;
}

/** Marcador das partes do CLAUDE.md que o Claude completa lendo o projeto. */
export const TO_FILL = "a preencher";

/**
 * Comandos, convenções de código e decisões de arquitetura.
 * Comandos nunca são inventados: ficam marcados para o Claude descobrir no projeto
 * (prompt de ativação) ou definir na fase de arquitetura (modo do zero).
 */
function projectSections(input: KitInput): string {
  const { mode, saas } = input;
  const stacks = detectStacks(saas);
  const zero = mode === "zero";
  const where = zero
    ? `_${TO_FILL} na fase de arquitetura, depois do brief aprovado._`
    : `_${TO_FILL} pelo Claude lendo ${stacks.length ? [...new Set(stacks.flatMap((s) => s.commandSources))].join(", ") : "os arquivos de configuração do projeto (ex.: `package.json`, `pyproject.toml`, `Makefile`)"}; mostrar ao usuário antes de gravar._`;

  const conventions = stacks.length
    ? stacks
        .map((s) => `**${s.label}**\n${s.conventions.map((c) => `- ${c}`).join("\n")}`)
        .join("\n\n")
    : `_${TO_FILL}: descrever nomenclatura, estrutura de pastas e tratamento de erro ${zero ? "quando a stack for escolhida" : "observando o código existente"}._`;

  return `## Comandos do projeto

${where}

| Para quê | Comando |
|---|---|
| Instalar dependências | _${TO_FILL}_ |
| Rodar em desenvolvimento | _${TO_FILL}_ |
| Testes | _${TO_FILL}_ |
| Lint | _${TO_FILL}_ |
| Typecheck | _${TO_FILL}_ |
| Build | _${TO_FILL}_ |

## Convenções de código

${conventions}

Siga sempre o padrão que já existe no código ao redor. Quando o projeto contradisser algo daqui, o projeto vence; atualize esta seção.

## Decisões de arquitetura

${zero ? `_${TO_FILL} no fim da descoberta: stack, hospedagem, banco, autenticação e pagamentos, com o motivo de cada escolha._` : `_${TO_FILL} pelo Claude: as decisões que o código já mostra (framework, banco, autenticação, onde ficam as regras de negócio), em uma linha cada, com o motivo quando souber._`}
`;
}

export function claudeMd(input: KitInput): string {
  const { saas, mode } = input;
  const ctx = input.context;
  const parts: string[] = [];
  parts.push(`# ${saas.name}: instruções para o Claude Code\n`);
  parts.push(`_${brand.generatedBy} em ${formatDate(input.generatedAt)}._\n`);
  if (mode === "zero") parts.push(discoveryBlock());
  if (mode === "erro") parts.push(fixBlock());
  if (mode === "ajuste") parts.push(quickBlock());

  if (isTaskMode(mode)) {
    parts.push(`## Contexto do projeto

| | |
|---|---|
| **Projeto** | ${cell(saas.name)} |
| **O que o produto faz** | ${cell(val(saas.description, "_descobrir lendo o código_"))} |
| **Stack** | ${cell(saas.stack.length ? saas.stack.join(", ") : "_descobrir analisando o código_")} |
| **Tarefa** | ${mode === "erro" ? "Consertar um erro" : "Atualização rápida"} (detalhes no \`TAREFA.md\`) |
| **Nível técnico de quem usa** | ${TECH_LABEL[tech(saas)]} |
`);
  } else
  parts.push(`## Contexto do SaaS

| | |
|---|---|
| **Nome** | ${cell(saas.name)} |
| **Descrição** | ${cell(saas.description)} |
| **Nicho** | ${cell(val(saas.niche))} |
| **Problema que resolve** | ${cell(val(saas.problem))} |
| **Modelo** | ${saas.model ?? "_a confirmar_"} |
| **Estágio** | ${saas.stage ? STAGE_LABEL[saas.stage] : "_a confirmar_"} |
| **Stack** | ${cell(saas.stack.length ? saas.stack.join(", ") : mode === "zero" ? "_a definir na descoberta_" : "_descobrir analisando o código_")} |
| **Objetivo do momento** | ${cell(val(saas.goal))} |
| **Nível técnico de quem usa** | ${TECH_LABEL[tech(saas)]} |
`);

  if (ctx) {
    parts.push(`### Em resumo\n${ctx.summary}\n\n**Focos agora:**\n${ctx.focus.map((f) => `- ${f}`).join("\n")}\n`);
  }

  if (input.agents.length) {
    parts.push(`## Agentes instalados (\`.claude/agents/\`)

Chame pelo nome, por exemplo: "Use o agente ${input.agents[0].item.id} para ...".

| Agente | Quando usar | Exemplo de pedido |
|---|---|---|
${input.agents
  .map((a) => {
    const u = usageFor(input, a.item.id);
    return `| \`${a.item.id}\` | ${cell(u?.whenToUse ?? a.item.whenToUse)} | ${cell(u?.example ?? a.item.example)} |`;
  })
  .join("\n")}
`);
  }

  if (input.skills.length) {
    parts.push(`## Skills instaladas (\`.claude/skills/\`)

As skills são ativadas automaticamente quando o pedido combina com a descrição delas. Você também pode chamá-las com \`/nome-da-skill\`.

| Skill | Para que serve | Exemplo de pedido |
|---|---|---|
${input.skills
  .map((s) => {
    const u = usageFor(input, s.item.id);
    return `| \`${s.item.id}\` | ${cell(u?.whenToUse ?? s.item.summary)} | ${cell(u?.example ?? s.item.example)} |`;
  })
  .join("\n")}
`);
  }

  if (input.mcps.length) {
    parts.push(`## MCPs configurados (\`.mcp.json\`)

| MCP | Para que serve | Credencial | Risco |
|---|---|---|---|
${input.mcps
  .map((m) => `| \`${m.id}\` | ${cell(usageFor(input, m.id)?.whenToUse ?? m.purpose)} | ${AUTH_LABEL[m.auth]} | ${RISK_LABEL[m.riskLevel]} |`)
  .join("\n")}

Antes de usar um MCP que escreve dados, explique ao usuário o que vai fazer e peça confirmação.
`);
  }

  parts.push(projectSections(input));

  parts.push(`## Convenções de trabalho

- Responda sempre em português do Brasil, com clareza e sem jargão desnecessário.
- Peça confirmação antes de alterar muitos arquivos de uma vez, apagar algo ou rodar comandos irreversíveis.
- Nunca escreva segredos (chaves, tokens, senhas) em arquivos versionados. Use variáveis de ambiente e o \`.env\`, que fica fora do git.
- Nunca peça para o usuário colar segredos no chat.
- Prefira mudanças pequenas e revisáveis, uma de cada vez, explicando o que mudou.
- Quando não tiver certeza de um comando, pacote ou API, consulte a documentação oficial em vez de supor.
- Os agentes, skills e MCPs deste kit são pontos de partida: adapte-os ao projeto conforme ele evolui.
`);

  parts.push(`## O que NÃO fazer

- Não commitar \`.env\`, chaves, tokens ou dados de clientes, nem colar segredos em código, logs ou mensagens.
- Não instalar, remover ou atualizar dependências sem pedir antes e explicar o motivo.
- Não rodar comandos destrutivos sem confirmação explícita: \`rm -rf\`, \`git push --force\`, \`git reset --hard\`, \`DROP\`/\`TRUNCATE\`, apagar branches ou bancos.
- Não editar migrações de banco já aplicadas; crie uma nova.
- Não desligar, pular ou apagar testes, tipos ou regras de lint para fazer algo passar.
- Não mexer em arquivos fora do escopo pedido nem refatorar "de passagem".
- Não inventar APIs, pacotes, comandos ou opções: confirme na documentação ou no código.
- Não dizer que terminou sem mostrar o resultado da verificação (seção abaixo).
`);

  parts.push(`## Verificação antes de dizer que terminou

1. Rode os comandos de teste, lint, typecheck e build da seção "Comandos do projeto".
2. Mostre o resultado resumido de cada um (passou, falhou, quantos testes).
3. Se algo falhar por causa da mudança, corrija e rode de novo. Se falhar por outro motivo, explique.
4. Se o projeto não tiver testes ou algum desses comandos, diga isso e explique como conferiu o resultado.
5. Termine com um resumo: o que mudou, arquivos alterados e como a pessoa pode conferir.
`);

  return parts.join("\n");
}

// ─────────────────────────── BRIEFING.md ───────────────────────────

export function briefingMd(input: KitInput): string {
  const s = input.saas;
  const q = (label: string, answer?: string) =>
    `### ${label}\n${answer && answer.trim() ? `${answer.trim()}\n\n_(a confirmar)_` : "_a preencher_"}\n`;
  return `# Briefing: ${s.name}

_${brand.generatedBy} em ${formatDate(input.generatedAt)}._

Este é o formulário da descoberta. O Claude vai confirmar o que já está escrito e perguntar o que falta, em blocos de até 4 perguntas. Pode editar à vontade.

## O produto
${q("Nome", s.name)}
${q("Descrição curta", s.description)}
${q("Nicho", s.niche)}
${q("Modelo (B2B, B2C, B2B2C)", s.model ?? "")}
${q("Estágio", s.stage ? STAGE_LABEL[s.stage] : "")}

## Cliente e problema
${q("Quem é o cliente ideal?")}
${q("Qual é a dor principal?", s.problem)}
${q("Como ele resolve isso hoje?")}
${q("Proposta de valor (por que escolheriam você)")}

## Negócio
${q("Modelo de receita e preços previstos")}
${q("Objetivo do momento", s.goal)}
${q("Prazo")}
${q("Orçamento")}
${q("Referências e concorrentes")}

## MVP
${q("Funcionalidades essenciais do MVP")}
${q("O que fica de fora do MVP")}
${q("Integrações necessárias (pagamento, e-mail, WhatsApp etc.)")}

## Tecnologia
${q("Preferências de stack", s.stack.join(", "))}
${q("Hospedagem")}
${q("Nível técnico de quem vai construir", s.techLevel ? TECH_LABEL[s.techLevel] : "")}

## Privacidade e marca
${q("Requisitos de privacidade e LGPD (quais dados pessoais serão coletados?)")}
${q("Identidade visual desejada (cores, tom, referências)")}

## Brief do Projeto (preenchido pelo Claude ao fim da descoberta)
_a preencher_

**Aprovado pelo usuário:** ☐ sim
`;
}

// ─────────────────────────── TAREFA.md (modos erro e ajuste) ───────────────────────────

export function tarefaMd(input: KitInput): string {
  const { saas, mode } = input;
  const bug = mode === "erro";
  const done = bug
    ? [
        "O erro foi reproduzido antes da correção.",
        "A causa raiz foi explicada com arquivo e linha.",
        "A correção é mínima e foi aprovada antes de ser aplicada.",
        "Existe um teste que falharia se o erro voltasse.",
        "Os testes do projeto passam.",
      ]
    : [
        "A mudança faz exatamente o que foi pedido, e nada além.",
        "O plano foi aprovado antes da edição.",
        "Lint, testes e build do projeto passam.",
        "O resumo explica como conferir a mudança.",
      ];
  return `# ${bug ? "Erro a consertar" : "Atualização rápida"}: ${saas.name}

_${brand.generatedBy} em ${formatDate(input.generatedAt)}._

## ${bug ? "O que está dando errado" : "O que mudar"}
${saas.task.trim()}

## ${bug ? "Como reproduzir e mensagem de erro" : "Onde fica e restrições"}
${saas.details.trim() || "_não informado: pergunte ao usuário se precisar_"}

## Contexto
- Projeto: ${saas.name}
- O que o produto faz: ${val(saas.description, "_descobrir lendo o código_")}
- Stack: ${saas.stack.length ? saas.stack.join(", ") : "_descobrir analisando o código_"}

## Pronto quando
${done.map((d) => `- [ ] ${d}`).join("\n")}

## Registro (o Claude preenche ao terminar)
${bug ? "- Causa raiz:\n- Correção:\n- Teste de regressão:" : "- O que mudou:"}
- Arquivos alterados:
- Como conferir:
`;
}

// ─────────────────────────── PROMPT-DE-ATIVACAO.md ───────────────────────────

export function activationPrompt(input: KitInput): string {
  const { saas } = input;
  const header = `# Prompt de ativação: ${saas.name}

_${brand.generatedBy}._ Copie tudo que está dentro do bloco abaixo e cole no Claude Code, aberto na pasta do projeto.

`;
  const hasMcps = input.mcps.length > 0;
  const level = TECH_LABEL[tech(saas)].toLowerCase();
  if (input.mode === "erro") {
    return `${header}\`\`\`text
Olá! Preciso consertar um erro no ${saas.name}. O MODO CONSERTO está ativo no CLAUDE.md.

1. Leia o CLAUDE.md e o TAREFA.md, com a descrição do erro e como reproduzir.
2. Olhe a estrutura do projeto só o necessário para achar o código envolvido e descobrir os comandos de teste, lint e build (package.json ou equivalente). Anote-os na tabela "Comandos do projeto" do CLAUDE.md, me mostrando antes de gravar.
3. Reproduza o erro (de preferência com um teste que falha). Se faltar informação, me pergunte antes.
4. Me explique a causa raiz com o arquivo e a linha, e proponha a correção mínima. Espere minha aprovação.
5. Aplique a correção, adicione um teste de regressão e rode testes, lint e typecheck. Me mostre o resultado.
6. Termine com um resumo: causa, correção, arquivos alterados, como eu confiro e uma sugestão de mensagem de commit.
${hasMcps ? "7. Se algum MCP do .mcp.json ajudar (ex.: logs de erro), me diga como conectar. Nunca me peça senhas ou chaves aqui no chat.\n" : ""}
Não mexa em nada que não tenha relação com o erro. Fale comigo em português e no nível ${level}.
\`\`\`
`;
  }
  if (input.mode === "ajuste") {
    return `${header}\`\`\`text
Olá! Quero fazer uma atualização rápida no ${saas.name}. O MODO AJUSTE RÁPIDO está ativo no CLAUDE.md.

1. Leia o CLAUDE.md e o TAREFA.md, com a mudança que eu quero.
2. Encontre no código exatamente onde a mudança acontece e descubra os comandos de teste, lint e build (package.json ou equivalente). Anote-os na tabela "Comandos do projeto" do CLAUDE.md, me mostrando antes de gravar.
3. Me mostre um plano curto: quais arquivos mudam e o que muda em cada um. Espere minha aprovação.
4. Faça só o que foi pedido, seguindo o estilo do código ao redor. Se crescer além de poucos arquivos, pare e me avise.
5. Rode o lint, os testes, o typecheck e o build que o projeto tiver, e me mostre o resultado.
6. Termine com um resumo do que mudou, como eu confiro e uma sugestão de mensagem de commit.

Fale comigo em português e no nível ${level}.
\`\`\`
`;
  }
  if (input.mode === "zero") {
    return `${header}\`\`\`text
Olá! Vamos começar o ${saas.name} do zero, juntos.

1. Leia o CLAUDE.md, o BRIEFING.md, os agentes em .claude/agents/ e as skills em .claude/skills/${hasMcps ? " e o .mcp.json" : ""}.
2. O MODO DESCOBERTA está ativo. Antes de criar qualquer arquivo de projeto, instalar dependências ou rodar comandos, me entreviste sobre o SaaS seguindo as regras do CLAUDE.md: blocos de no máximo 4 perguntas, confirmando o que já está no BRIEFING.md.
3. Ao terminar, use a skill brief-do-projeto (se estiver instalada) para consolidar tudo em um Brief do Projeto, atualize o BRIEFING.md e o CLAUDE.md e me peça aprovação.
4. Com o brief aprovado, proponha a arquitetura e a stack com prós e contras${input.agents.some((a) => a.item.id === "arquiteto-produto") ? " (use o agente arquiteto-produto)" : ""}, e um plano de construção por etapas dizendo qual agente ou skill entra em cada etapa.
5. Espere minha aprovação do plano. Com a arquitetura aprovada, preencha no CLAUDE.md as seções "Comandos do projeto", "Convenções de código" e "Decisões de arquitetura".
6. Execute uma etapa por vez. Ao fim de cada uma, mostre o resultado dos testes, do lint e do typecheck e peça confirmação antes da próxima.
${hasMcps ? "7. Verifique quais MCPs precisam de credencial ou login e me oriente a configurar. Nunca me peça para colar chaves ou senhas aqui no chat.\n" : ""}
Fale comigo em português e no nível ${TECH_LABEL[tech(saas)].toLowerCase()}.
\`\`\`
`;
  }
  const steps = [
    `Leia o CLAUDE.md, os agentes em .claude/agents/, as skills em .claude/skills/${hasMcps ? " e o .mcp.json" : ""}.`,
    "Analise o código lendo o package.json (ou equivalente), a árvore de pastas e os arquivos de configuração: stack, dependências, rotas, modelo de dados, testes e scripts.",
    "Escreva um Brief do Projeto curto (o que é, stack real, principais módulos, riscos que você notou).",
    `Proponha o texto das seções do CLAUDE.md marcadas "${TO_FILL}": Comandos do projeto (rode os de teste e lint uma vez para confirmar que funcionam), Convenções de código (observadas no código, não genéricas) e Decisões de arquitetura. Me mostre a proposta e só grave depois da minha aprovação.`,
    "Adapte os agentes e as skills à realidade do código: caminhos, comandos, convenções e ferramentas. Me mostre um resumo do que vai mudar antes de editar.",
    ...(hasMcps ? ["Verifique quais MCPs precisam de credenciais ou login e me oriente a configurar. Nunca me peça para colar chaves ou senhas aqui no chat."] : []),
    `Proponha um plano com a ordem de execução: qual agente ou skill usar primeiro e por quê, ligado ao objetivo do momento${saas.goal ? ` ("${saas.goal.replace(/\s+/g, " ")}")` : ""}.`,
    "Espere minha aprovação. Depois, execute um item por vez e, ao fim de cada um, mostre o resultado dos testes, do lint e do typecheck antes de dizer que terminou.",
  ];
  return `${header}\`\`\`text
Olá! Instalei um kit de agentes, skills${hasMcps ? " e MCPs" : ""} para o ${saas.name}. Quero que você adapte esse kit ao meu projeto.

${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Fale comigo em português e no nível ${TECH_LABEL[tech(saas)].toLowerCase()}.
\`\`\`
`;
}

// ─────────────────────────── LEIA-ME.md ───────────────────────────

export function readmeMd(input: KitInput, tree: string, notPersonalized: string[]): string {
  const { saas, mode } = input;
  const lv = tech(saas);
  const vars = envVars(input.mcps);
  const root = kitRoot(saas);
  const firstAgent = input.agents[0]?.item;
  const firstSkill = input.skills[0]?.item;
  const s: string[] = [];

  s.push(`# ${saas.name}: seu kit para o Claude Code

_${brand.generatedBy} em ${formatDate(input.generatedAt)}. Tutorial no nível ${TECH_LABEL[lv].toLowerCase()}._

${pick(lv, {
  iniciante:
    "Bem-vindo! Este guia leva você do zip até o Claude Code trabalhando no seu projeto, passo a passo. Não precisa saber programar para seguir. Se travar em algum ponto, a seção de solução de problemas no final ajuda.",
  intermediario: "Este guia mostra como instalar o kit no seu projeto e colocar os agentes, skills e MCPs para trabalhar.",
  avancado: "Instalação rápida do kit. Detalhes e solução de problemas no fim.",
})}
`);

  if (notPersonalized.length) {
    s.push(`> [!NOTE]
> Estes itens não puderam ser personalizados durante a geração e foram incluídos com o modelo base, que já funciona: ${notPersonalized.join(", ")}. Você pode pedir ao Claude para adaptá-los ao seu projeto.
`);
  }

  s.push(`## 1. O que tem no pacote

${input.agents.length} agentes, ${input.skills.length} skills e ${input.mcps.length} MCPs, mais os arquivos de contexto.

\`\`\`text
${tree}
\`\`\`

- **CLAUDE.md**: o contexto do seu SaaS e as regras de trabalho. O Claude Code lê esse arquivo sozinho toda vez que começa.
- **.claude/agents/**: os agentes (subagents). Cada um é um especialista que o Claude chama para uma tarefa.
- **.claude/skills/**: as skills. São instruções que o Claude ativa quando o pedido combina com elas.
${input.mcps.length ? "- **.mcp.json**: os servidores MCP, que conectam o Claude a outras ferramentas.\n- **.env.example**: a lista das variáveis que os MCPs precisam, sem valores.\n" : ""}- **PROMPT-DE-ATIVACAO.md**: a primeira mensagem para colar no Claude Code.
${mode === "zero" ? "- **BRIEFING.md**: o formulário da descoberta, que o Claude vai preencher com você.\n" : ""}${isTaskMode(mode) ? `- **TAREFA.md**: ${mode === "erro" ? "o erro a consertar, como reproduzir" : "a mudança pedida"} e o que significa "pronto". Pode editar antes de começar.\n` : ""}`);

  s.push(`## 2. Pré-requisitos

- Claude Code instalado. Siga o guia oficial: https://code.claude.com/docs/en/setup
${pick(lv, {
  iniciante:
    "- Nunca usou um terminal? A documentação tem um guia para isso: https://code.claude.com/docs/en/terminal-guide\n- Para conferir a instalação, abra um terminal novo e rode `claude --version`. Se aparecer um número de versão, está tudo certo.\n",
  intermediario: "- Confira com `claude --version`.\n",
  avancado: "",
})}${input.mcps.some((m) => m.requirements.length) ? `- Alguns MCPs do seu kit precisam de programas extras:\n${[...new Set(input.mcps.flatMap((m) => m.requirements.map((r) => `  - ${m.name}: ${r}`)))].join("\n")}\n` : ""}${pick(lv, {
  iniciante: "- Recomendado: o projeto dentro de um repositório git, para poder desfazer mudanças com segurança.\n",
  intermediario: "- Recomendado: projeto versionado com git e working tree limpa antes de começar.\n",
  avancado: "- Working tree limpa no git.\n",
})}`);

  s.push(`## 3. Descompacte o zip

${pick(lv, {
  iniciante: `Clique duas vezes no arquivo \`${root}.zip\` (ou use "Extrair tudo" no Windows). Vai aparecer uma pasta chamada \`${root}\`.

> Atenção: arquivos que começam com ponto, como \`.claude\`, \`.mcp.json\` e \`.env.example\`, podem ficar ocultos. No Windows, ative "Itens ocultos" na aba Exibir do Explorador. No macOS, aperte Cmd + Shift + . (ponto) no Finder.`,
  intermediario: `Extraia \`${root}.zip\`. Lembre que \`.claude/\`, \`.mcp.json\` e \`.env.example\` são arquivos ocultos.`,
  avancado: `Extraia \`${root}.zip\` (contém dotfiles).`,
})}
`);

  s.push(`## 4. Copie para a raiz do projeto

${mode === "zero"
  ? `Como você vai começar do zero, crie uma pasta vazia para o projeto (por exemplo \`${slugify(saas.name)}\`) e copie para ela **todo o conteúdo** de dentro da pasta \`${root}\`.`
  : `Copie para a **raiz** do seu projeto (a pasta principal, onde ficam arquivos como \`package.json\`, \`README.md\` ou \`.git\`):`}

- a pasta \`.claude\`
- \`CLAUDE.md\`
${input.mcps.length ? "- `.mcp.json`\n- `.env.example`\n" : ""}- \`PROMPT-DE-ATIVACAO.md\` e este \`LEIA-ME.md\` (opcionais, servem de referência)
${mode === "zero" ? "- `BRIEFING.md`\n" : ""}
> **Já tem um CLAUDE.md, um .mcp.json ou uma pasta .claude?** Não sobrescreva. ${pick(lv, {
  iniciante: "Copie o kit para uma pasta separada e peça ao Claude: \"Mescle o CLAUDE.md e o .mcp.json do kit com os que já existem, sem apagar nada, e me mostre o resultado antes de salvar\".",
  intermediario: "Mescle manualmente ou peça ao Claude para mesclar e mostrar o diff antes de salvar. No `.mcp.json`, junte as entradas dentro de `mcpServers`.",
  avancado: "Mescle: em `.mcp.json`, una as chaves de `mcpServers`; em `.claude/`, os arquivos novos não colidem com nomes iguais, confira antes.",
})}
`);

  if (input.mcps.length) {
    s.push(`## 5. Configure as credenciais dos MCPs

${vars.length
  ? `Alguns MCPs precisam de uma chave. Ela fica **só no seu computador**, nunca no git nem no chat.

1. Copie \`.env.example\` para um arquivo novo chamado \`.env\`, na raiz do projeto.
2. Preencha os valores no \`.env\`.
3. Garanta que o \`.env\` está no \`.gitignore\` (adicione a linha \`.env\` se não estiver).
4. O Claude Code lê as variáveis do terminal em que ele foi aberto. Carregue o \`.env\` nesse terminal antes de iniciar:

   macOS, Linux ou Git Bash:
   \`\`\`bash
   set -a; source .env; set +a
   \`\`\`

   Windows PowerShell:
   \`\`\`powershell
   Get-Content .env | Where-Object { $_ -match '^[A-Z][A-Z0-9_]*=' } | ForEach-Object { $k, $v = $_ -split '=', 2; Set-Item "env:$k" $v }
   \`\`\`
${pick(lv, {
  iniciante: "\n   Você vai precisar repetir esse comando sempre que abrir um terminal novo.\n",
  intermediario: "\n   Se preferir, use uma ferramenta como direnv para carregar automaticamente.\n",
  avancado: "",
})}`
  : "Nenhum MCP do seu kit precisa de chave em arquivo. Os servidores remotos usam login pelo navegador (OAuth), feito dentro do Claude Code no passo 7."}

| MCP | Credencial | Onde obter | Risco |
|---|---|---|---|
${input.mcps
  .map((m) => {
    const cred = m.requiredEnvVars.length
      ? m.requiredEnvVars.map((e) => `\`${e.name}\``).join(", ")
      : AUTH_LABEL[m.auth];
    const where = m.requiredEnvVars[0]?.whereToGet ?? m.docsUrl;
    return `| ${m.name} | ${cred} | ${where} | ${RISK_LABEL[m.riskLevel]} |`;
  })
  .join("\n")}
`);
  } else {
    s.push(`## 5. Credenciais

Seu kit não tem MCPs, então não há credenciais para configurar.
`);
  }

  s.push(`## 6. Abra o Claude Code na raiz do projeto

${pick(lv, {
  iniciante: `Abra um terminal **dentro da pasta do projeto**. No Windows, você pode abrir a pasta no Explorador, clicar na barra de endereço, digitar \`powershell\` e apertar Enter. No macOS, clique com o botão direito na pasta e escolha "Novo Terminal na Pasta". Depois digite:`,
  intermediario: "No terminal, entre na raiz do projeto e rode:",
  avancado: "Na raiz:",
})}

\`\`\`bash
claude
\`\`\`
${input.mcps.length ? "\nNa primeira vez, o Claude Code pergunta se você confia nos servidores do `.mcp.json` deste projeto. Leia a lista e aprove os que reconhecer.\n" : ""}`);

  s.push(`## 7. Confira se tudo carregou

- **Agentes:** pergunte "Quais subagentes estão disponíveis neste projeto?". O comando \`/agents\` também ajuda a gerenciar os agentes. Se a pasta \`.claude/agents\` foi criada com o Claude Code aberto, feche e abra de novo.
- **Skills:** digite \`/skills\` para ver as skills carregadas.
${input.mcps.length ? "- **MCPs:** digite `/mcp` para ver o status de cada servidor e fazer login nos que usam OAuth. Fora do Claude Code, `claude mcp list` mostra a mesma lista. Status `✔ Connected` significa conectado; `! Needs authentication` pede login pelo `/mcp`.\n" : ""}`);

  s.push(`## 8. Cole o prompt de ativação

Abra \`PROMPT-DE-ATIVACAO.md\`, copie o texto do bloco e cole no Claude Code. ${
    mode === "zero"
      ? "Ele vai começar a entrevista da descoberta: responda com calma, em blocos."
      : mode === "erro"
        ? "Ele vai reproduzir o erro, explicar a causa e propor a correção antes de mexer."
        : mode === "ajuste"
          ? "Ele vai localizar a mudança, mostrar um plano curto e esperar sua aprovação."
          : "Ele vai analisar o seu código e adaptar o kit."
  }
`);

  s.push(`## 9. Revise e aprove o plano

O Claude vai propor um plano em etapas e esperar sua aprovação. Leia com atenção, peça ajustes se quiser e só então aprove. ${pick(lv, {
  iniciante: "Você pode responder com frases simples, como \"pode seguir com a etapa 1\" ou \"explique melhor a etapa 2\".",
  intermediario: "Aprove etapa por etapa e revise os diffs.",
  avancado: "Revise os diffs a cada etapa.",
})}
`);

  s.push(`## 10. Como usar no dia a dia

Peça normalmente, citando o agente ou a skill quando quiser um especialista:

${firstAgent ? `- "${usageFor(input, firstAgent.id)?.example ?? firstAgent.example}" (chama o agente \`${firstAgent.id}\`)\n` : ""}${firstSkill ? `- "${firstSkill.example}" (ativa a skill \`${firstSkill.id}\`; ou digite \`/${firstSkill.id}\`)\n` : ""}${input.mcps[0] ? `- "${input.mcps[0].example}" (usa o MCP ${input.mcps[0].name})\n` : ""}`);

  s.push(`## 11. O que tem no seu kit

${input.agents.length ? `### Agentes
| Nome | Para que serve | Exemplo de pedido |
|---|---|---|
${input.agents.map((a) => `| \`${a.item.id}\` | ${cell(a.item.description)} | ${cell(usageFor(input, a.item.id)?.example ?? a.item.example)} |`).join("\n")}
` : ""}
${input.skills.length ? `### Skills
| Nome | Para que serve | Exemplo de pedido |
|---|---|---|
${input.skills.map((x) => `| \`${x.item.id}\` | ${cell(x.item.summary)} | ${cell(usageFor(input, x.item.id)?.example ?? x.item.example)} |`).join("\n")}
` : ""}
${input.mcps.length ? `### MCPs
| Nome | Para que serve | Exemplo de pedido | Documentação |
|---|---|---|---|
${input.mcps.map((m) => `| ${m.name} | ${cell(m.purpose)} | ${cell(m.example)} | ${m.docsUrl} |`).join("\n")}
` : ""}`);

  s.push(`## 12. Solução de problemas

- **Os agentes ou skills não aparecem:** confira se a pasta \`.claude\` está na raiz do projeto (e não dentro de \`${root}\`). Feche e abra o Claude Code de novo.
- **Abri o Claude Code na pasta errada:** ele só enxerga os arquivos da pasta onde foi aberto. Saia, entre na raiz do projeto e rode \`claude\` de novo.
${input.mcps.length ? `- **Um MCP não conecta:** digite \`/mcp\` e veja o status. Se pedir login, siga o navegador. Se der falha, confira os pré-requisitos (Node.js ou uv) e a documentação do servidor na tabela acima.
- **No Windows, um MCP com \`npx\` não inicia:** no \`.mcp.json\`, troque \`"command": "npx"\` por \`"command": "cmd"\` e coloque \`"/c", "npx"\` no começo de \`args\`.
- **Variável faltando:** se \`claude mcp list\` avisar sobre variável não definida, o \`.env\` não foi carregado no terminal. Repita o passo 5 no mesmo terminal e abra o Claude Code de novo.
` : ""}`);

  s.push(`## 13. Segurança

- Use git e faça um commit antes de pedir mudanças grandes. Assim dá para desfazer qualquer coisa.
- Revise as alterações antes de aceitar, principalmente em arquivos de configuração, pagamento e autenticação.
- Nunca cole chaves, tokens ou senhas no chat. Elas ficam só no \`.env\`.
- Conceda só as permissões necessárias: prefira tokens com escopo mínimo e modos somente leitura quando existirem.
${input.mcps.some((m) => m.riskLevel !== "leitura") ? `- Atenção aos MCPs que escrevem dados ou têm acesso amplo: ${input.mcps.filter((m) => m.riskLevel !== "leitura").map((m) => m.name).join(", ")}. Confirme cada ação antes.\n` : ""}`);

  s.push(`## 14. Ponto de partida, não ponto final

Agentes, skills e MCPs são pontos de partida. Revise tudo antes de usar em produção e adapte ao seu projeto conforme ele cresce. Documentos jurídicos gerados pelos agentes não substituem um advogado.

Bom trabalho, e que o ${saas.name} acenda.
`);

  return s.join("\n");
}

// ─────────────────────────── montagem completa ───────────────────────────

/** Gera todos os arquivos do kit (caminhos relativos à pasta raiz `<slug>-kit/`). */
export function buildKitFiles(input: KitInput): KitFile[] {
  const notPersonalized = [
    ...input.agents.filter((a) => !a.personalized).map((a) => a.item.name),
    ...input.skills.filter((s) => !s.personalized).map((s) => s.item.name),
  ];
  const root = kitRoot(input.saas);

  const core: KitFile[] = [
    ...input.agents.map(agentFile),
    ...input.skills.flatMap(skillFiles),
    { path: "CLAUDE.md", content: claudeMd(input) },
    { path: "PROMPT-DE-ATIVACAO.md", content: activationPrompt(input) },
  ];
  if (input.mcps.length) {
    core.push({ path: ".mcp.json", content: mcpJson(input.mcps) });
    core.push({ path: ".env.example", content: envExample(input.mcps) });
  }
  if (input.mode === "zero") core.push({ path: "BRIEFING.md", content: briefingMd(input) });
  if (isTaskMode(input.mode)) core.push({ path: "TAREFA.md", content: tarefaMd(input) });

  const allPaths = [...core.map((f) => f.path), "LEIA-ME.md"];
  const tree = `${root}/\n${renderTreeText(buildTree(allPaths))}`;
  // Itens "não personalizados" só fazem sentido quando houve tentativa de personalização.
  core.push({
    path: "LEIA-ME.md",
    content: readmeMd(input, tree, input.personalizationAttempted ? notPersonalized : []),
  });

  return core.map((f) => {
    if (!isSafeZipPath(f.path)) throw new Error(`Caminho inseguro no kit: ${f.path}`);
    return { path: f.path, content: redactSecrets(f.content) };
  });
}
