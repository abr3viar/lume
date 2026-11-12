import { agentById, mcpById, skillById, type Audience } from "@/data/catalog";
import type { BusinessModel } from "@/lib/schemas";

export type CartIds = { agents: string[]; skills: string[]; mcps: string[] };
export type CheckLevel = "info" | "atencao";
export type CartCheck = { id: string; level: CheckLevel; title: string; detail: string };

export const MCP_SOFT_LIMIT = 5;

function audienceMismatch(applies: Audience, model: BusinessModel) {
  if (applies === "ambos" || model === "B2B2C") return false;
  return applies !== model;
}

/** Verificações amigáveis sobre o carrinho. Não bloqueiam a geração: só orientam. */
export function checkCart(cart: CartIds, model: BusinessModel | undefined): CartCheck[] {
  const out: CartCheck[] = [];
  const agents = cart.agents.map((id) => agentById.get(id)).filter((x) => !!x);
  const skills = cart.skills.map((id) => skillById.get(id)).filter((x) => !!x);
  const mcps = cart.mcps.map((id) => mcpById.get(id)).filter((x) => !!x);

  if (agents.length === 0 && skills.length === 0 && mcps.length === 0) {
    return [{ id: "vazio", level: "atencao", title: "Seu kit está vazio", detail: "Adicione pelo menos um agente, skill ou MCP." }];
  }

  const vars = new Set(mcps.flatMap((m) => m.requiredEnvVars.map((e) => e.name)));
  const tokenMcps = mcps.filter((m) => m.auth === "token");
  const oauthMcps = mcps.filter((m) => m.auth === "oauth");
  if (tokenMcps.length) {
    out.push({
      id: "credenciais",
      level: "atencao",
      title: `${vars.size} ${vars.size === 1 ? "variável de ambiente" : "variáveis de ambiente"} para preencher`,
      detail: `${tokenMcps.map((m) => m.name).join(", ")} ${tokenMcps.length === 1 ? "precisa" : "precisam"} de chave. Ela fica só no seu .env local; o LEIA-ME mostra onde obter.`,
    });
  }
  if (oauthMcps.length) {
    out.push({
      id: "oauth",
      level: "info",
      title: `${oauthMcps.length} ${oauthMcps.length === 1 ? "MCP usa" : "MCPs usam"} login pelo navegador`,
      detail: `${oauthMcps.map((m) => m.name).join(", ")}: depois de abrir o Claude Code, digite /mcp e faça login. Nenhuma chave em arquivo.`,
    });
  }

  if (mcps.length > MCP_SOFT_LIMIT) {
    out.push({
      id: "muitos-mcps",
      level: "atencao",
      title: `${mcps.length} MCPs é bastante`,
      detail: `Cada MCP adiciona ferramentas e instruções ao contexto do Claude. Recomendamos até ${MCP_SOFT_LIMIT} essenciais; você pode ativar outros depois.`,
    });
  }

  const risky = mcps.filter((m) => m.riskLevel === "amplo");
  if (risky.length) {
    out.push({
      id: "acesso-amplo",
      level: "atencao",
      title: "MCP com acesso amplo",
      detail: `${risky.map((m) => m.name).join(", ")} pode agir em qualquer site. Use em ambiente de teste e revise as ações.`,
    });
  }

  // Redundâncias declaradas no catálogo (só reporta cada par uma vez).
  const pairs = new Set<string>();
  const addOverlap = (kind: string, a: { id: string; name: string; overlapsWith: string[] }, ids: string[], name: (id: string) => string) => {
    for (const o of a.overlapsWith) {
      if (!ids.includes(o)) continue;
      const key = [kind, ...[a.id, o].sort()].join(":");
      if (pairs.has(key)) continue;
      pairs.add(key);
      out.push({
        id: `redundancia-${key}`,
        level: "info",
        title: `${a.name} e ${name(o)} se sobrepõem`,
        detail: "Os dois cobrem parte do mesmo trabalho. Mantenha ambos só se quiser papéis separados.",
      });
    }
  };
  for (const a of agents) addOverlap("agent", a, cart.agents, (id) => agentById.get(id)?.name ?? id);
  for (const s of skills) addOverlap("skill", s, cart.skills, (id) => skillById.get(id)?.name ?? id);

  const native = mcps.filter((m) => ["filesystem", "fetch", "git"].includes(m.id));
  if (native.length) {
    out.push({
      id: "nativos",
      level: "info",
      title: "O Claude Code já faz parte disso sozinho",
      detail: `${native.map((m) => m.name).join(", ")}: o Claude Code já lê arquivos, usa git e acessa a web nativamente. Mantenha só se tiver um motivo específico.`,
    });
  }

  if (model) {
    const mismatched = [...agents, ...skills, ...mcps].filter((x) => audienceMismatch(x.appliesTo, model));
    if (mismatched.length) {
      out.push({
        id: "publico",
        level: "info",
        title: `Itens pensados para ${model === "B2B" ? "B2C" : "B2B"}`,
        detail: `${mismatched.map((x) => x.name).join(", ")} ${mismatched.length === 1 ? "foi pensado" : "foram pensados"} para outro modelo de negócio. Confira se faz sentido para o seu SaaS.`,
      });
    }
  }

  if (agents.length === 0) {
    out.push({
      id: "sem-agentes",
      level: "info",
      title: "Nenhum agente no kit",
      detail: "Os agentes são os especialistas que fazem o trabalho pesado. Vale adicionar pelo menos um.",
    });
  }

  return out;
}
