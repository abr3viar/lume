import { mcpById, type Mcp } from "@/data/catalog";
import type { SaasInfo } from "@/lib/schemas";

/**
 * Serviços que a pessoa diz usar (stack, descrição, tarefa) e que têm MCP no catálogo.
 * Com isso a IA sabe que deve oferecer a conexão como plugin/MCP, mesmo que o item não esteja no carrinho.
 */
const SERVICE_PATTERNS: [string, RegExp][] = [
  ["github", /\bgit\s?hub\b/i],
  ["vercel", /\bvercel\b/i],
  ["supabase", /\bsupabase\b/i],
  ["stripe", /\bstripe\b/i],
  ["sentry", /\bsentry\b/i],
  ["linear", /\blinear\.app\b|\b(no|pelo|usamos o|uso o) linear\b/i],
  ["notion", /\bnotion\b/i],
  ["figma", /\bfigma\b/i],
  ["posthog", /\bpost\s?hog\b/i],
];

export function detectServices(saas: SaasInfo): Mcp[] {
  const text = [saas.stack.join(" "), saas.description, saas.details, saas.task, saas.goal, saas.problem]
    .filter(Boolean)
    .join(" \n ");
  return SERVICE_PATTERNS.flatMap(([id, re]) => (re.test(text) ? [mcpById.get(id)!].filter(Boolean) : []));
}

export type Connection = { mcp: Mcp; inKit: boolean; detected: boolean };

/** MCPs do kit + serviços detectados, sem repetir. Os do kit primeiro. */
export function connectionsFor(saas: SaasInfo, kitMcps: Mcp[]): Connection[] {
  const detected = new Set(detectServices(saas).map((m) => m.id));
  const out: Connection[] = kitMcps.map((m) => ({ mcp: m, inKit: true, detected: detected.has(m.id) }));
  for (const id of detected) if (!kitMcps.some((m) => m.id === id)) out.push({ mcp: mcpById.get(id)!, inKit: false, detected: true });
  return out;
}

/** Só os serviços remotos/da conta da pessoa entram como "conexão" (os utilitários locais não precisam de conversa). */
const isAccountService = (m: Mcp) => m.transport === "http" || m.requiredEnvVars.length > 0;

export function connectionsSection(saas: SaasInfo, kitMcps: Mcp[], mcpPath: string): string {
  const list = connectionsFor(saas, kitMcps).filter((c) => isAccountService(c.mcp));
  if (!list.length) return "";
  const cell = (v: string) => v.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
  return `## Conexões com as ferramentas do projeto

${list.some((c) => c.detected) ? "Você contou que usa algumas destas ferramentas. " : ""}Conectadas, elas deixam a IA ler dados reais (deploys, erros, issues, banco) em vez de supor.

| Ferramenta | Situação | O que a conexão permite | Documentação |
|---|---|---|---|
${list
  .map(
    (c) =>
      `| ${c.mcp.name} | ${c.inKit ? `configurada no \`${mcpPath}\`` : "citada pelo usuário, ainda não configurada"} | ${cell(c.mcp.purpose)} | ${c.mcp.docsUrl} |`,
  )
  .join("\n")}

**Regra para a IA:** no começo da primeira sessão, confira quais destas conexões estão ativas na lista de MCPs ou plugins da ferramenta. Para cada uma que faltar, pergunte à pessoa se ela quer conectar agora, diga em uma frase o que ela ganha e guie a conexão passo a passo pela documentação acima. Peça uma de cada vez e respeite um "agora não". Nunca peça token, chave ou senha no chat: credenciais vão no \`.env\` ou no login OAuth da própria ferramenta.
`;
}

export const CONNECT_STEP =
  'Antes de mexer no projeto, confira a seção "Conexões com as ferramentas do projeto" do CLAUDE.md e me pergunte, uma de cada vez, se quero conectar as que ainda não estão ativas.';
