import type { Preset } from "./schema";

export const presetsInput: Preset[] = [
  {
    id: "lancamento-mvp",
    name: "Lançamento de MVP",
    description: "Do escopo enxuto ao deploy: definir, construir com testes e colocar no ar com segurança.",
    appliesTo: "ambos",
    agents: ["definicao-mvp", "arquiteto-produto", "copy-landing-page", "gerador-testes", "planejamento-deploy"],
    skills: ["escrever-prd", "plano-testes", "seguranca-pre-deploy", "checklist-lancamento"],
    mcps: ["context7", "vercel", "playwright"],
  },
  {
    id: "crescimento-b2b",
    name: "Crescimento B2B",
    description: "Prospecção, qualificação, preço e sucesso do cliente para vender e reter contas.",
    appliesTo: "B2B",
    agents: ["sdr-prospeccao", "qualificacao-leads", "customer-success", "metricas-saas", "pricing-planos", "seo-conteudo"],
    skills: ["analise-funil", "metricas-sucesso", "copy-precos", "roteiro-entrevista"],
    mcps: ["posthog", "notion"],
  },
  {
    id: "retencao-b2c",
    name: "Retenção B2C",
    description: "Onboarding, hábito e comunidade para o usuário voltar e ficar.",
    appliesTo: "B2C",
    agents: ["onboarding-usuarios", "churn-retencao", "email-lifecycle", "comunidade", "gamificacao", "suporte-cliente"],
    skills: ["plano-onboarding", "escrita-email-lifecycle", "analise-funil", "backlog-feedback"],
    mcps: ["posthog", "stripe"],
  },
  {
    id: "qualidade-seguranca",
    name: "Qualidade e segurança de código",
    description: "Revisão, testes, segurança e observabilidade para mudar código com confiança.",
    appliesTo: "ambos",
    agents: ["revisor-codigo", "gerador-testes", "seguranca-owasp", "triagem-bugs", "performance-web", "documentacao-tecnica"],
    skills: ["revisao-pr", "seguranca-pre-deploy", "plano-testes", "checklist-acessibilidade", "commits-changelog"],
    mcps: ["github", "sentry", "playwright"],
  },
];
