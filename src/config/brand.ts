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
  /** Exemplos clicáveis que preenchem o campo principal do assistente. */
  examples: {
    saas: [
      { label: "Agenda para clínicas", text: "Agenda online para clínicas pequenas, com confirmação de consultas e lembretes por WhatsApp para reduzir faltas." },
      { label: "Cursos online", text: "Plataforma para professores autônomos venderem cursos gravados, com área do aluno, certificados e pagamento por Pix." },
      { label: "Estoque de restaurante", text: "Controle de estoque e pedidos para pequenos restaurantes, com alerta de ingredientes acabando e lista de compras automática." },
    ],
    erro: [
      { label: "Erro ao salvar", text: "Ao salvar o formulário de cadastro, a página dá erro 500 e os dados não são gravados no banco." },
      { label: "Login no celular", text: "O login com Google funciona no computador, mas no celular volta para a tela inicial sem entrar na conta." },
    ],
    ajuste: [
      { label: "Texto e cor do botão", text: "Trocar o texto do botão principal da home para 'Começar grátis' e usar a cor da marca no botão." },
      { label: "Campo novo", text: "Adicionar o campo telefone (opcional) no formulário de cadastro e salvar no banco junto com o nome." },
    ],
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
