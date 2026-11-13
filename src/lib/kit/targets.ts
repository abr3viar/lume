import type { Mcp } from "@/data/catalog";
import { agentDescription } from "@/data/catalog/triggers";

/**
 * Para qual ferramenta de IA o kit é montado. O conteúdo (contexto, agentes, skills, MCPs e o método Lume)
 * é o mesmo; muda onde cada coisa mora e o formato de cada arquivo.
 * Formatos conferidos na documentação oficial em 2026-11-12 (veja `docsUrl`).
 */
export type KitTarget = "claude-code" | "codex" | "gemini" | "cursor" | "grok" | "outra";

export const TARGET_IDS: KitTarget[] = ["claude-code", "codex", "gemini", "cursor", "grok", "outra"];

export type TargetProfile = {
  id: KitTarget;
  label: string;
  /** Uma linha para a interface. */
  blurb: string;
  instructions: string;
  agentsDir: string;
  skillsDir: string;
  /** Arquivo de MCP que a ferramenta lê; `reference` quando é só uma referência para configurar à mão. */
  mcp: { path: string; reference: boolean };
  /** Como chamar um agente e como as skills são ativadas, em uma frase cada. */
  agentHint: (id: string) => string;
  skillHint: string;
  docsUrl: string;
  install: string;
  supportsHooks: boolean;
};

export const TARGETS: Record<KitTarget, TargetProfile> = {
  "claude-code": {
    id: "claude-code",
    label: "Claude Code",
    blurb: "Agentes, skills, MCPs e proteções no formato nativo.",
    instructions: "CLAUDE.md",
    agentsDir: ".claude/agents/",
    skillsDir: ".claude/skills/",
    mcp: { path: ".mcp.json", reference: false },
    agentHint: (id) => `Chame pelo nome, por exemplo: "Use o agente ${id} para ...".`,
    skillHint:
      "As skills são ativadas automaticamente quando o pedido combina com a descrição delas. Você também pode chamá-las com `/nome-da-skill`.",
    docsUrl: "https://code.claude.com/docs/en/setup",
    install: "Instale o Claude Code pelo guia oficial e rode `claude` na pasta do projeto.",
    supportsHooks: true,
  },
  codex: {
    id: "codex",
    label: "Codex",
    blurb: "AGENTS.md, subagentes em .codex/agents e skills em .agents/skills.",
    instructions: "AGENTS.md",
    agentsDir: ".codex/agents/",
    skillsDir: ".agents/skills/",
    mcp: { path: ".codex/config.toml", reference: false },
    agentHint: (id) => `Peça pelo nome, por exemplo: "Use o subagente ${id} para ...".`,
    skillHint: "As skills são escolhidas pelo Codex quando o pedido combina com a descrição delas.",
    docsUrl: "https://developers.openai.com/codex",
    install:
      "Instale o Codex CLI pelo guia oficial e rode `codex` na pasta do projeto. O `.codex/config.toml` do projeto só é lido depois que você marca a pasta como confiável.",
    supportsHooks: false,
  },
  gemini: {
    id: "gemini",
    label: "Gemini CLI",
    blurb: "GEMINI.md, comandos /agente e /skill e MCPs no settings.json.",
    instructions: "GEMINI.md",
    agentsDir: ".gemini/commands/agente/",
    skillsDir: "skills/",
    mcp: { path: ".gemini/settings.json", reference: false },
    agentHint: (id) => `Use o comando \`/agente:${id}\` seguido do pedido.`,
    skillHint: "Cada skill virou um comando: digite `/skill:nome-da-skill` seguido do pedido.",
    docsUrl: "https://geminicli.com/docs/",
    install: "Instale o Gemini CLI pelo guia oficial e rode `gemini` na pasta do projeto.",
    supportsHooks: false,
  },
  cursor: {
    id: "cursor",
    label: "Cursor",
    blurb: "AGENTS.md e regras em .cursor/rules; MCPs para configurar no app.",
    instructions: "AGENTS.md",
    agentsDir: ".cursor/rules/",
    skillsDir: "skills/",
    mcp: { path: "mcp-servidores.json", reference: true },
    agentHint: (id) => `Mencione a regra \`@agente-${id}\` no chat, ou deixe o Cursor escolher pela descrição.`,
    skillHint: "Cada skill tem uma regra em `.cursor/rules/` que aponta para o passo a passo em `skills/`.",
    docsUrl: "https://cursor.com/docs/context/rules",
    install: "Abra a pasta do projeto no Cursor. As regras e o AGENTS.md são lidos sozinhos.",
    supportsHooks: false,
  },
  grok: {
    id: "grok",
    label: "Grok Build",
    blurb: "AGENTS.md, skills em .grok/skills e MCPs no .grok/config.toml.",
    instructions: "AGENTS.md",
    agentsDir: "agentes/",
    skillsDir: ".grok/skills/",
    mcp: { path: ".grok/config.toml", reference: false },
    agentHint: (id) => `Peça: "Leia agentes/${id}.md e siga esse papel para ...".`,
    skillHint: "As skills são escolhidas pelo Grok quando o pedido combina com a descrição delas.",
    docsUrl: "https://docs.x.ai/build/overview",
    install: "Instale o Grok Build pelo guia oficial da xAI e rode `grok` na pasta do projeto.",
    supportsHooks: false,
  },
  outra: {
    id: "outra",
    label: "Outra IA",
    blurb: "AGENTS.md, o padrão aberto lido por dezenas de ferramentas.",
    instructions: "AGENTS.md",
    agentsDir: "agentes/",
    skillsDir: "skills/",
    mcp: { path: "mcp-servidores.json", reference: true },
    agentHint: (id) => `Peça: "Leia agentes/${id}.md e siga esse papel para ...".`,
    skillHint: "Quando o pedido combinar com uma skill, peça para a IA ler o `SKILL.md` dela e seguir o passo a passo.",
    docsUrl: "https://agents.md/",
    install: "Abra o projeto na sua ferramenta de IA. Se ela não ler o AGENTS.md sozinha, cole o conteúdo dele no início da conversa.",
    supportsHooks: false,
  },
};

export function targetOf(t: KitTarget | undefined | null): TargetProfile {
  return TARGETS[t ?? "claude-code"] ?? TARGETS["claude-code"];
}

// ─────────────────────────── formatos ───────────────────────────

/** String TOML básica. A saída do JSON.stringify é uma string básica válida em TOML. */
export const tomlString = (s: string) => JSON.stringify(s);
const tomlKey = (k: string) => (/^[A-Za-z0-9_-]+$/.test(k) ? k : tomlString(k));
const tomlArray = (xs: string[]) => `[${xs.map(tomlString).join(", ")}]`;
const tomlInline = (o: Record<string, string>) =>
  `{ ${Object.entries(o)
    .map(([k, v]) => `${tomlKey(k)} = ${tomlString(v)}`)
    .join(", ")} }`;

/** `${CLAUDE_PROJECT_DIR:-.}` é do Claude Code; fora dele, a pasta atual. */
const portableArgs = (args: string[]) => args.map((a) => a.replace(/\$\{CLAUDE_PROJECT_DIR(:-[^}]*)?\}/g, "."));

const ONLY_VAR = /^\$\{([A-Z][A-Z0-9_]*)\}$/;
const BEARER_VAR = /^Bearer \$\{([A-Z][A-Z0-9_]*)\}$/;

type Stdio = { command: string; args?: string[]; env?: Record<string, string> };
type Http = { type: "http"; url: string; headers?: Record<string, string> };
const isHttp = (c: Mcp["config"]): c is Http => "type" in c;

/** Codex: `[mcp_servers.id]`. Variáveis viram `env_vars` / `bearer_token_env_var` (o Codex não expande `${VAR}`). */
export function codexMcpToml(mcps: Mcp[]): string {
  const out = ["# Gerado pelo Lume. Sem segredos: os valores vêm das variáveis de ambiente.", ""];
  for (const m of mcps) {
    out.push(`# ${m.name}: ${m.docsUrl}`, `[mcp_servers.${tomlKey(m.id)}]`);
    const c = m.config;
    if (isHttp(c)) {
      out.push(`url = ${tomlString(c.url)}`);
      const envHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(c.headers ?? {})) {
        const bearer = BEARER_VAR.exec(v);
        const only = ONLY_VAR.exec(v);
        if (k.toLowerCase() === "authorization" && bearer) out.push(`bearer_token_env_var = ${tomlString(bearer[1])}`);
        else if (only) envHeaders[k] = only[1];
      }
      if (Object.keys(envHeaders).length) out.push(`env_http_headers = ${tomlInline(envHeaders)}`);
    } else {
      const s = c as Stdio;
      out.push(`command = ${tomlString(s.command)}`);
      if (s.args?.length) out.push(`args = ${tomlArray(portableArgs(s.args))}`);
      const vars = Object.values(s.env ?? {}).flatMap((v) => [...v.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map((x) => x[1]));
      if (vars.length) out.push(`env_vars = ${tomlArray([...new Set(vars)])}`);
    }
    out.push("");
  }
  return `${out.join("\n").trimEnd()}\n`;
}

/** Grok Build: `[mcp_servers.id]` com `${VAR}` expandido na carga. */
export function grokMcpToml(mcps: Mcp[]): string {
  const out = ["# Gerado pelo Lume. Sem segredos: ${VAR} é lido do seu ambiente.", ""];
  for (const m of mcps) {
    out.push(`# ${m.name}: ${m.docsUrl}`, `[mcp_servers.${tomlKey(m.id)}]`);
    const c = m.config;
    if (isHttp(c)) {
      out.push(`url = ${tomlString(c.url)}`);
      if (c.headers && Object.keys(c.headers).length) out.push(`headers = ${tomlInline(c.headers)}`);
    } else {
      const s = c as Stdio;
      out.push(`command = ${tomlString(s.command)}`);
      if (s.args?.length) out.push(`args = ${tomlArray(portableArgs(s.args))}`);
      if (s.env && Object.keys(s.env).length) out.push(`env = ${tomlInline(s.env)}`);
    }
    out.push("");
  }
  return `${out.join("\n").trimEnd()}\n`;
}

/** Gemini CLI: `mcpServers` no settings.json; `${VAR}` é expandido pelo Gemini. */
export function geminiSettings(mcps: Mcp[]): string {
  const servers: Record<string, unknown> = {};
  for (const m of mcps) {
    const c = m.config;
    if (isHttp(c)) servers[m.id] = { httpUrl: c.url, ...(c.headers ? { headers: c.headers } : {}) };
    else {
      const s = c as Stdio;
      servers[m.id] = { command: s.command, args: portableArgs(s.args ?? []), ...(s.env ? { env: s.env } : {}) };
    }
  }
  return `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`;
}

/** Referência no formato mais comum (`mcpServers`), para ferramentas cujo arquivo de MCP não conferimos. */
export function mcpReference(mcps: Mcp[]): string {
  const servers: Record<string, unknown> = {};
  for (const m of mcps) {
    const c = m.config;
    servers[m.id] = isHttp(c) ? c : { ...c, args: portableArgs((c as Stdio).args ?? []) };
  }
  return `${JSON.stringify({ _leiaMe: "Referência gerada pelo Lume. Copie cada servidor para a configuração de MCP da sua ferramenta; os ${'${VAR}'} vêm do seu ambiente.", mcpServers: servers }, null, 2)}\n`;
}

/** Comando do Gemini CLI. `!{` e `@{` do texto do catálogo são neutralizados para não virarem shell ou injeção de arquivo. */
export function geminiCommand(description: string, prompt: string): string {
  const safe = prompt.replace(/!\{/g, "! {").replace(/@\{/g, "@ {");
  return `description = ${tomlString(description.replace(/\s+/g, " ").trim())}\nprompt = ${tomlString(safe)}\n`;
}

export function geminiSkillCommand(id: string, description: string): string {
  return `description = ${tomlString(description.replace(/\s+/g, " ").trim())}\nprompt = ${tomlString(
    `Siga a skill abaixo, passo a passo.\n\n@{skills/${id}/SKILL.md}\n\n## Pedido\n{{args}}`,
  )}\n`;
}

export function codexAgentToml(id: string, description: string, prompt: string): string {
  return `name = ${tomlString(id)}\ndescription = ${tomlString(agentDescription(description, id).replace(/\s+/g, " ").trim())}\ndeveloper_instructions = ${tomlString(prompt.trim())}\n`;
}

export function cursorRule(description: string, body: string, alwaysApply = false): string {
  const d = description.replace(/\s+/g, " ").trim().replace(/"/g, '\\"');
  return `---\ndescription: "${d}"\nglobs:\nalwaysApply: ${alwaysApply}\n---\n\n${body.trim()}\n`;
}

/** Troca as menções ao Claude Code nos textos do kit pelas da ferramenta escolhida. */
export function retarget(text: string, t: TargetProfile): string {
  if (t.id === "claude-code") return text;
  const pairs: [string | RegExp, string][] = [
    [
      "As skills são ativadas automaticamente quando o pedido combina com a descrição delas. Você também pode chamá-las com `/nome-da-skill`.",
      t.skillHint,
    ],
    [/^- O `\.claude\/settings\.json` bloqueia[^\n]*\n/m, ""],
    ["Os servidores remotos usam login OAuth: digite /mcp dentro do Claude Code.", "Os servidores remotos usam login OAuth: veja no LEIA-ME como conectar."],
    [/\.claude\/agents\//g, t.agentsDir],
    [/\.claude\/skills\//g, t.skillsDir],
    [/\.mcp\.json/g, t.mcp.path],
    [/CLAUDE\.md/g, t.instructions],
    [/Claude Code/g, t.label],
    [/\bpelo Claude\b/g, "pela IA"],
    [/\bdo Claude\b/g, "da IA"],
    [/\bao Claude\b/g, "à IA"],
    [/\bno Claude\b/g, "na IA"],
    [/\bO Claude\b/g, "A IA"],
    [/\bo Claude\b/g, "a IA"],
  ];
  let out = text.replace(/Chame pelo nome, por exemplo: "Use o agente ([\w-]+) para \.\.\."\./g, (_m, id: string) => t.agentHint(id));
  for (const [from, to] of pairs) out = out.replace(from, to);
  return out;
}
