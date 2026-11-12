/**
 * Identidade do produto em um único lugar.
 * Para renomear o produto, troque os valores abaixo: a interface, os metadados
 * e os arquivos gerados no zip leem tudo daqui.
 */
export const brand = {
  name: "Lume",
  tagline: "Acenda o seu SaaS.",
  heroSubtitle:
    "Descreva seu produto e receba um kit sob medida de agentes, skills e MCPs para o Claude Code. Baixe, solte na pasta e comece.",
  description:
    "Monte um kit sob medida de agentes, skills e MCPs para o Claude Code a partir da descrição do seu SaaS.",
  footer:
    "Lume. Agentes, skills e MCPs são pontos de partida; revise tudo antes de usar em produção.",
  generatedBy: "Kit gerado pelo Lume",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lume-kit.vercel.app",
  copy: {
    heroCta: "Acender meu kit",
    generate: "Gerar meu kit",
    emptyCart: "Seu kit está apagado. Adicione um agente para acender.",
    success: "Tudo aceso! Seu kit está pronto.",
    genericError: "Faltou luz por aqui. Tente de novo em instantes.",
  },
  /** Como cada modo de IA aparece na interface. */
  aiModes: {
    "claude-code": {
      label: "IA pela sua conta do Claude",
      detail: "O Claude Code do seu computador escolhe e personaliza cada item. Sem chave de API.",
    },
    api: {
      label: "IA pela API da Anthropic",
      detail: "A IA escolhe e personaliza cada item para o seu SaaS.",
    },
    local: {
      label: "Sem IA: grátis, sem conta",
      detail: "O recomendador do Lume escolhe pelo que você contou. A adaptação fina acontece no Claude Code, pelo prompt de ativação.",
    },
  },
} as const;

export type Brand = typeof brand;
