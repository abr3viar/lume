import { agents, mcps, skills, type Audience, type ItemKind, type Stage } from "@/data/catalog";
import { KIT_LIMITS } from "@/config/kit";
import { essentialMax, type RecommendedItem } from "@/lib/ai/recommend-core";
import { isTaskMode, STAGE_LABEL, type RecommendRequest, type SaasInfo } from "@/lib/schemas";

/**
 * Recomendador local do Lume: funciona sem chave de API.
 * Pontua cada item do catálogo pelos sinais do SaaS (modo, modelo, estágio, nicho,
 * problema, objetivo e stack) e escreve a justificativa a partir dos sinais que bateram.
 * É determinístico: os mesmos dados geram as mesmas sugestões.
 */

type Rule = { when: RegExp; boost: Partial<Record<ItemKind, string[]>>; why: string };

/** Regras por tema, aplicadas ao texto livre (nicho, descrição, problema, objetivo). */
const RULES: Rule[] = [
  {
    when: /sa[uú]de|cl[ií]nic|m[eé]dic|hospital|paciente|odonto|psic|terapia|farm/,
    boost: { agent: ["termos-privacidade-lgpd", "suporte-cliente", "compliance-auditoria"], skill: ["checklist-lgpd"] },
    why: "dados de saúde são sensíveis pela LGPD",
  },
  {
    when: /fintech|financ|banc|pagament|cr[eé]dit|cobran|pix|boleto|fatura|contab/,
    boost: { agent: ["cobranca-inadimplencia", "seguranca-owasp", "compliance-auditoria"], skill: ["seguranca-pre-deploy", "checklist-lgpd"], mcp: ["stripe"] },
    why: "o produto lida com dinheiro e dados financeiros",
  },
  {
    when: /e-?commerce|loja|varejo|marketplace|vend(a|er) online|produtos? f[ií]sic/,
    boost: { agent: ["copy-landing-page", "email-lifecycle", "seo-conteudo", "pricing-planos"], skill: ["analise-funil", "escrita-email-lifecycle"], mcp: ["stripe", "posthog"] },
    why: "a conversão e a recompra pesam muito no seu nicho",
  },
  {
    when: /educa|escola|curso|aluno|professor|ensino|aprend/,
    boost: { agent: ["onboarding-usuarios", "gamificacao", "comunidade", "base-conhecimento"], skill: ["plano-onboarding"] },
    why: "aprendizado depende de engajamento contínuo",
  },
  {
    when: /jur[ií]dic|advoga|contrato|escrit[oó]rio|lei\b/,
    boost: { agent: ["compliance-auditoria", "termos-privacidade-lgpd", "documentacao-tecnica"], skill: ["checklist-lgpd"] },
    why: "o público jurídico exige rigor com dados e documentos",
  },
  {
    when: /\brh\b|recursos humanos|recrut|colaborador|funcion[aá]ri|folha|benef[ií]cio/,
    boost: { agent: ["termos-privacidade-lgpd", "onboarding-usuarios", "automacao-operacoes"], skill: ["checklist-lgpd", "plano-onboarding"] },
    why: "o produto trata dados de pessoas e processos internos",
  },
  {
    when: /marketing|ag[eê]ncia|an[uú]ncio|campanha|lead|tr[aá]fego|redes sociais/,
    boost: { agent: ["seo-conteudo", "copy-landing-page", "social-media", "email-lifecycle"], skill: ["auditoria-seo-on-page", "analise-funil"], mcp: ["posthog"] },
    why: "aquisição e conteúdo são o centro do negócio",
  },
  {
    when: /log[ií]stic|entrega|frete|transport|estoque|armaz[eé]m|frota/,
    boost: { agent: ["automacao-operacoes", "analista-dados-sql", "performance-web"], skill: ["runbook-incidentes"] },
    why: "operação e dados em tempo real fazem a diferença",
  },
  {
    when: /imobili|im[oó]ve|aluguel|corretor|condom[ií]nio/,
    boost: { agent: ["qualificacao-leads", "sdr-prospeccao", "copy-landing-page", "email-lifecycle"], skill: ["escrita-email-lifecycle"] },
    why: "o ciclo de venda depende de bons leads e acompanhamento",
  },
  {
    when: /restaurante|delivery|card[aá]pio|food|bar\b|padaria/,
    boost: { agent: ["onboarding-usuarios", "suporte-cliente", "social-media"], skill: ["plano-onboarding"] },
    why: "o uso no dia a dia precisa ser simples e rápido",
  },
  // Objetivos e problemas comuns
  {
    when: /cliente|vend[aeê]|receita|faturar|monetiz|pagante|convers/,
    boost: { agent: ["copy-landing-page", "pricing-planos", "qualificacao-leads"], skill: ["copy-precos", "analise-funil"] },
    why: "seu objetivo passa por conquistar clientes pagantes",
  },
  {
    when: /churn|reten|cancel|abandon|engaj|voltar a usar|recorr/,
    boost: { agent: ["churn-retencao", "customer-success", "onboarding-usuarios", "email-lifecycle"], skill: ["plano-onboarding", "backlog-feedback"] },
    why: "reter quem já chegou é prioridade para você",
  },
  {
    when: /lan[cç]a|mvp|validar|primeira vers|go-?live|publicar/,
    boost: { agent: ["definicao-mvp", "planejamento-deploy", "gerador-testes"], skill: ["checklist-lancamento", "seguranca-pre-deploy", "plano-testes"], mcp: ["vercel", "playwright"] },
    why: "você está perto de lançar",
  },
  {
    when: /seo|org[aâ]nic|google|busca|blog|conte[uú]do/,
    boost: { agent: ["seo-conteudo"], skill: ["auditoria-seo-on-page"] },
    why: "você quer crescer por busca orgânica",
  },
  {
    when: /bug|erro|qualidade|teste|quebr|inst[aá]vel|falha/,
    boost: { agent: ["triagem-bugs", "gerador-testes", "revisor-codigo"], skill: ["plano-testes", "revisao-pr", "post-mortem"], mcp: ["sentry", "playwright"] },
    why: "qualidade e estabilidade estão no seu radar",
  },
  {
    when: /seguran|invas|vazament|ataque|hack|prote/,
    boost: { agent: ["seguranca-owasp", "compliance-auditoria"], skill: ["seguranca-pre-deploy", "checklist-lgpd"] },
    why: "segurança é uma preocupação explícita",
  },
  {
    when: /lento|performance|velocidade|escal|carga|demora/,
    boost: { agent: ["performance-web", "analista-dados-sql"], skill: ["runbook-incidentes"], mcp: ["sentry"] },
    why: "desempenho e escala aparecem no que você contou",
  },
  {
    when: /m[eé]trica|dado|relat[oó]rio|dashboard|kpi|funil|analytics/,
    boost: { agent: ["metricas-saas", "analista-dados-sql"], skill: ["metricas-sucesso", "analise-funil"], mcp: ["posthog"] },
    why: "decisões baseadas em dados são importantes para você",
  },
  {
    when: /suporte|atendimento|ticket|d[uú]vida|reclama/,
    boost: { agent: ["suporte-cliente", "base-conhecimento"], skill: ["backlog-feedback"] },
    why: "o atendimento ao cliente pesa no seu dia a dia",
  },
  {
    when: /design|interface|ui\b|ux\b|visual|figma|tela/,
    boost: { agent: ["design-system-ui"], skill: ["checklist-acessibilidade"], mcp: ["figma"] },
    why: "a experiência visual é importante para você",
  },
  {
    when: /parceri|afiliad|indica[cç]|revend|canal/,
    boost: { agent: ["parcerias-afiliados"] },
    why: "parcerias e indicações estão nos seus planos",
  },
  {
    when: /api\b|integra[cç]|webhook|desenvolvedor/,
    boost: { agent: ["documentacao-tecnica"], skill: ["documentacao-api", "versionamento"] },
    why: "integrações e API fazem parte do produto",
  },
  {
    when: /automat|manual|planilha|repetitiv|processo/,
    boost: { agent: ["automacao-operacoes"] },
    why: "há processos manuais que podem ser automatizados",
  },
];

/** Stack informada → MCPs e itens que fazem sentido. */
const STACK_RULES: { when: RegExp; mcp?: string[]; agent?: string[]; label: string }[] = [
  { when: /supabase/, mcp: ["supabase"], label: "Supabase" },
  { when: /vercel|next/, mcp: ["vercel"], label: "Vercel" },
  { when: /stripe/, mcp: ["stripe"], label: "Stripe" },
  { when: /posthog/, mcp: ["posthog"], label: "PostHog" },
  { when: /sentry/, mcp: ["sentry"], label: "Sentry" },
  { when: /figma/, mcp: ["figma"], label: "Figma" },
  { when: /notion/, mcp: ["notion"], label: "Notion" },
  { when: /linear/, mcp: ["linear"], label: "Linear" },
  { when: /github/, mcp: ["github"], label: "GitHub" },
  { when: /postgres|mysql|sql|supabase|firebase|prisma|mongo/, agent: ["analista-dados-sql", "modelagem-dados"], label: "banco de dados" },
  { when: /react|next|vue|svelte|angular|flutter|native/, mcp: ["playwright", "context7"], label: "front-end" },
];

/** Sugestões por estágio. */
const STAGE_BOOST: Record<Stage, Partial<Record<ItemKind, string[]>>> = {
  ideia: {
    agent: ["pesquisa-usuarios", "pesquisa-concorrentes", "definicao-mvp", "pricing-planos"],
    skill: ["roteiro-entrevista", "escrever-prd", "brief-do-projeto"],
  },
  mvp: {
    agent: ["definicao-mvp", "copy-landing-page", "gerador-testes", "planejamento-deploy"],
    skill: ["checklist-lancamento", "seguranca-pre-deploy", "plano-testes"],
    mcp: ["context7", "github"],
  },
  "primeiros-clientes": {
    agent: ["suporte-cliente", "onboarding-usuarios", "metricas-saas", "triagem-bugs"],
    skill: ["plano-onboarding", "backlog-feedback", "metricas-sucesso"],
    mcp: ["sentry", "github"],
  },
  crescimento: {
    agent: ["churn-retencao", "customer-success", "performance-web", "seo-conteudo"],
    skill: ["analise-funil", "runbook-incidentes", "post-mortem"],
    mcp: ["posthog", "sentry"],
  },
};

/** Itens que servem a quase todo SaaS com código (pequeno empurrão). */
const GENERAL: Partial<Record<ItemKind, string[]>> = {
  agent: ["revisor-codigo", "suporte-cliente"],
  skill: ["revisao-pr", "commits-changelog"],
  mcp: ["github", "context7"],
};

/** MCPs que duplicam ferramentas nativas do Claude Code: só entram com motivo. */
const NATIVE_MCPS = ["filesystem", "fetch", "git", "memory", "sequential-thinking"];

function norm(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function fits(applies: Audience, model: SaasInfo["model"]) {
  return !model || applies === "ambos" || model === "B2B2C" || applies === model;
}

type Scored = { kind: ItemKind; id: string; score: number; reasons: string[]; order: number };
type Bump = (kind: ItemKind, ids: string[] | undefined, n: number, why?: string) => void;

/** Núcleo de cada modo de tarefa: o que quase sempre ajuda a consertar ou a ajustar. */
const TASK_CORE: Record<"erro" | "ajuste", { agent: [string, number][]; skill: [string, number][]; mcp: [string, number][]; why: string }> = {
  erro: {
    agent: [["triagem-bugs", 14], ["gerador-testes", 10], ["revisor-codigo", 8]],
    skill: [["plano-testes", 10], ["revisao-pr", 8], ["post-mortem", 5], ["runbook-incidentes", 4]],
    mcp: [["playwright", 6], ["github", 5], ["sentry", 5], ["context7", 4]],
    why: "ajuda a reproduzir, achar a causa e corrigir o erro que você descreveu",
  },
  ajuste: {
    agent: [["revisor-codigo", 12], ["gerador-testes", 7], ["changelog-release", 5]],
    skill: [["revisao-pr", 10], ["commits-changelog", 9], ["seguranca-pre-deploy", 5]],
    mcp: [["context7", 6], ["github", 5]],
    why: "mantém a mudança pequena, revisada e registrada",
  },
};

/** Assunto da tarefa: puxa o especialista certo. */
const TASK_RULES: { when: RegExp; boost: Partial<Record<ItemKind, string[]>>; why: string }[] = [
  { when: /texto|copy|titulo|botao|frase|mensagem de|chamada/, boost: { agent: ["copy-landing-page"] }, why: "a mudança mexe em textos da interface" },
  { when: /tela|layout|design|css|cor\b|cores|estilo|componente|\bui\b|responsiv|celular|mobile/, boost: { agent: ["design-system-ui"], skill: ["checklist-acessibilidade"], mcp: ["playwright", "figma"] }, why: "envolve a interface" },
  { when: /campo|formulario|banco|tabela|coluna|schema|migra|query|sql|supabase|postgres/, boost: { agent: ["modelagem-dados", "analista-dados-sql"], mcp: ["supabase"] }, why: "envolve dados e banco" },
  { when: /e-?mail|notifica/, boost: { agent: ["email-lifecycle"], skill: ["escrita-email-lifecycle"] }, why: "envolve e-mails ou notificações" },
  { when: /preco|plano|assinatura|pagamento|cobranca|checkout|stripe|pix|boleto/, boost: { agent: ["pricing-planos", "cobranca-inadimplencia"], skill: ["copy-precos"], mcp: ["stripe"] }, why: "envolve pagamento ou planos" },
  { when: /\bapi\b|endpoint|rota|webhook|integra/, boost: { agent: ["documentacao-tecnica"], skill: ["documentacao-api", "versionamento"] }, why: "envolve API ou integração" },
  { when: /lento|lentid|timeout|demora|travando|memoria|performance/, boost: { agent: ["performance-web"], mcp: ["sentry"] }, why: "o problema é de desempenho" },
  { when: /login|senha|permiss|acesso|token|autentic|seguran|vazament|invas/, boost: { agent: ["seguranca-owasp"], skill: ["seguranca-pre-deploy"] }, why: "envolve acesso e segurança" },
  { when: /dado pessoal|dados pessoais|cpf|lgpd|privacidade|consentimento/, boost: { agent: ["termos-privacidade-lgpd"], skill: ["checklist-lgpd"] }, why: "envolve dados pessoais" },
  { when: /deploy|vercel|build|producao|ambiente/, boost: { agent: ["planejamento-deploy"], mcp: ["vercel"] }, why: "envolve build ou deploy" },
  { when: /seo|google|meta tag|indexa/, boost: { agent: ["seo-conteudo"], skill: ["auditoria-seo-on-page"] }, why: "envolve SEO" },
  { when: /acessib|leitor de tela|contraste|teclado/, boost: { skill: ["checklist-acessibilidade"] }, why: "envolve acessibilidade" },
];

function scoreTask(mode: "erro" | "ajuste", text: string, all: (Scored & { foundation?: boolean })[], bump: Bump) {
  // Kit enxuto: fundação e agentes de negócio só entram se o assunto da tarefa pedir.
  for (const it of all) {
    if (it.kind === "agent") it.score -= 4;
    if ((it as { foundation?: boolean }).foundation) it.score -= 4;
  }
  const core = TASK_CORE[mode];
  for (const [id, n] of core.agent) bump("agent", [id], n, core.why);
  for (const [id, n] of core.skill) bump("skill", [id], n, core.why);
  for (const [id, n] of core.mcp) bump("mcp", [id], n, core.why);
  for (const r of TASK_RULES) {
    if (!r.when.test(text)) continue;
    // Especialista do assunto: na frente do núcleo.
    for (const k of ["agent", "skill", "mcp"] as const) {
      for (const id of r.boost[k] ?? []) {
        const it = all.find((x) => x.kind === k && x.id === id);
        if (it) {
          it.score += 12;
          it.reasons.unshift(r.why);
        }
      }
    }
  }
}

export function scoreCatalog(req: Pick<RecommendRequest, "mode" | "saas">): Scored[] {
  const { saas, mode } = req;
  const text = norm([saas.niche, saas.description, saas.problem, saas.goal, saas.task, saas.details].join(" \n "));
  const stack = norm(saas.stack.join(" "));
  const all: Scored[] = [
    ...agents.map((a, i) => ({ kind: "agent" as const, id: a.id, score: 0, reasons: [] as string[], order: i, applies: a.appliesTo, stages: a.stages, foundation: a.foundation })),
    ...skills.map((s, i) => ({ kind: "skill" as const, id: s.id, score: 0, reasons: [] as string[], order: i, applies: s.appliesTo, stages: s.stages, foundation: s.id === "brief-do-projeto" })),
    ...mcps.map((m, i) => ({ kind: "mcp" as const, id: m.id, score: 0, reasons: [] as string[], order: i, applies: m.appliesTo, stages: m.stages, foundation: false })),
  ];
  const byKey = new Map(all.map((x) => [`${x.kind}:${x.id}`, x]));
  const bump = (kind: ItemKind, ids: string[] | undefined, n: number, why?: string) => {
    for (const id of ids ?? []) {
      const it = byKey.get(`${kind}:${id}`);
      if (!it) continue;
      it.score += n;
      if (why && !it.reasons.includes(why)) it.reasons.push(why);
    }
  };

  for (const it of all) {
    const meta = it as Scored & { applies: Audience; stages: Stage[]; foundation: boolean };
    if (!fits(meta.applies, saas.model)) meta.score -= 20;
    else if (saas.model && meta.applies === saas.model) {
      meta.score += 2;
      meta.reasons.push(`foi pensado para negócios ${saas.model}`);
    }
    if (saas.stage && meta.stages.includes(saas.stage)) meta.score += 2;
    if (mode === "zero" && meta.foundation) {
      meta.score += 9;
      meta.reasons.unshift("você vai começar do zero e precisa de uma fundação sólida");
    }
    if (mode === "existente" && meta.foundation && it.kind === "agent") meta.score -= 3;
  }

  for (const r of RULES) {
    if (!r.when.test(text)) continue;
    bump("agent", r.boost.agent, 5, r.why);
    bump("skill", r.boost.skill, 5, r.why);
    bump("mcp", r.boost.mcp, 4, r.why);
  }
  for (const r of STACK_RULES) {
    if (!r.when.test(stack)) continue;
    bump("mcp", r.mcp, 7, `sua stack usa ${r.label}`);
    bump("agent", r.agent, 3, `sua stack usa ${r.label}`);
  }
  if (saas.stage) {
    const label = STAGE_LABEL[saas.stage].toLowerCase();
    const b = STAGE_BOOST[saas.stage];
    bump("agent", b.agent, 4, `é prioridade no estágio ${label}`);
    bump("skill", b.skill, 4, `é prioridade no estágio ${label}`);
    bump("mcp", b.mcp, 3, `ajuda no estágio ${label}`);
  }
  if (mode === "existente") {
    bump("agent", GENERAL.agent, 2, "ajuda qualquer projeto que já tem código");
    bump("skill", GENERAL.skill, 2, "ajuda qualquer projeto que já tem código");
    bump("mcp", GENERAL.mcp, 2, "ajuda qualquer projeto que já tem código");
  } else {
    bump("mcp", ["context7"], 3, "mantém o Claude atualizado sobre as bibliotecas que você escolher");
  }
  if (isTaskMode(mode)) scoreTask(mode, text, all, bump);
  bump("mcp", NATIVE_MCPS, -6);

  return all;
}

function writeReason(kind: ItemKind, it: Scored, saas: SaasInfo): string {
  const name = saas.name.trim() || "seu SaaS";
  // Motivos específicos primeiro; o de público (genérico) só completa.
  const generic = (s: string) => s.startsWith("foi pensado") || s.startsWith("ajuda qualquer");
  const r = [...it.reasons.filter((s) => !generic(s)), ...it.reasons.filter(generic)].slice(0, 2);
  if (r.length === 0) {
    const fallback: Record<ItemKind, string> = {
      agent: `Completa o time do ${name} com um especialista pronto para usar.`,
      skill: `Dá ao Claude um procedimento padronizado útil para o ${name}.`,
      mcp: `Conecta o Claude a uma ferramenta que o ${name} pode usar.`,
    };
    return fallback[kind];
  }
  const joined = r.length === 2 ? `${r[0]} e ${r[1]}` : r[0];
  const sentence = `Faz sentido para o ${name} porque ${joined}.`;
  return sentence.length > 380 ? `${sentence.slice(0, 377)}…` : sentence;
}

/** Recomendações locais no mesmo formato da IA, respeitando tipos, quantidades e exclusões. */
export function localRecommendations(req: RecommendRequest): RecommendedItem[] {
  const limits = isTaskMode(req.mode) ? KIT_LIMITS.task : KIT_LIMITS.full;
  const counts = req.more ? limits.localMore : limits.local;
  const essentialCap = essentialMax(req);
  const scored = scoreCatalog(req);
  const out: RecommendedItem[] = [];
  for (const kind of req.kinds) {
    const exclude = new Set(req.excludeIds[kind]);
    const pool = scored
      .filter((s) => s.kind === kind && !exclude.has(s.id) && s.score > -10)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, counts[kind]);
    const top = pool[0]?.score ?? 0;
    pool.forEach((s, i) => {
      // Essencial: entre os primeiros (limite por tipo) e com pontuação forte.
      const essential = i < essentialCap[kind] && s.score >= Math.max(6, top * 0.6);
      out.push({ kind, id: s.id, reason: writeReason(kind, s, req.saas), impact: essential ? "alto" : "médio" });
    });
  }
  return out;
}
