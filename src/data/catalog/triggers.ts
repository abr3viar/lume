/**
 * Pedidos concretos que devem acionar cada agente. Entram na `description` do
 * frontmatter: é por ela que o Claude decide quando delegar a um subagent.
 * Escreva como a pessoa escreveria no chat, curto e específico.
 */
export const AGENT_TRIGGERS: Record<string, string[]> = {
  "suporte-cliente": ["responda este ticket", "o cliente reclamou de cobrança", "escreva a resposta para este e-mail de cliente"],
  "onboarding-usuarios": ["os usuários se cadastram e não voltam", "melhore o primeiro acesso", "crie os e-mails dos primeiros 7 dias"],
  "base-conhecimento": ["crie a FAQ", "transforme estes tickets em artigos de ajuda", "monte a central de ajuda"],
  "churn-retencao": ["por que os clientes estão cancelando", "analise os cancelamentos do mês", "crie alertas de cliente em risco"],
  "customer-success": ["monte o health score das contas", "prepare a reunião de revisão com o cliente", "quais contas podem fazer upgrade"],
  "sdr-prospeccao": ["crie uma cadência de prospecção", "escreva e-mails frios para este perfil", "monte o perfil de cliente ideal"],
  "qualificacao-leads": ["crie o lead scoring", "roteiro para a primeira call de vendas", "quais leads priorizar"],
  "parcerias-afiliados": ["crie um programa de afiliados", "quanto pagar de comissão", "regulamento do programa de indicação"],
  "copy-landing-page": ["reescreva o texto da home", "melhore o título do hero", "escreva a página de preços"],
  "seo-conteudo": ["plano de conteúdo para o blog", "escreva um artigo otimizado para SEO", "quais palavras-chave atacar"],
  "email-lifecycle": ["escreva o fluxo de boas-vindas", "e-mail de reativação de inativos", "melhore a taxa de abertura"],
  "social-media": ["calendário de posts do mês", "transforme este artigo em posts", "escreva posts para o LinkedIn"],
  "metricas-saas": ["calcule o MRR e o churn", "qual é o LTV/CAC", "monte o painel de métricas"],
  "pricing-planos": ["defina os planos e preços", "devo cobrar por usuário ou por uso", "revise a página de preços"],
  "pesquisa-concorrentes": ["compare os concorrentes", "como os concorrentes cobram", "qual brecha de mercado existe"],
  "pesquisa-usuarios": ["roteiro de entrevista com clientes", "sintetize estas entrevistas", "valide esta hipótese com usuários"],
  "priorizacao-roadmap": ["priorize o backlog", "o que fazer no próximo trimestre", "aplique RICE nestas ideias"],
  "redator-prd": ["escreva o PRD desta funcionalidade", "especifique os requisitos", "critérios de aceite para esta feature"],
  "automacao-operacoes": ["automatize este relatório semanal", "pare de copiar dados entre sistemas", "crie um script para esta tarefa repetida"],
  "termos-privacidade-lgpd": ["rascunhe a política de privacidade", "quais dados pessoais coletamos", "escreva os termos de uso"],
  "compliance-auditoria": ["responda este questionário de segurança", "o que falta para ISO 27001 ou SOC 2", "inventário de controles de segurança"],
  "cobranca-inadimplencia": ["régua de cobrança", "pagamentos com cartão recusado", "mensagem para boleto vencido"],
  comunidade: ["crie as regras da comunidade", "lance um grupo de usuários", "rituais para engajar membros"],
  gamificacao: ["crie sequência diária e conquistas", "aumente a frequência de uso do app", "sistema de pontos e níveis"],
  "revisor-codigo": ["revise este PR", "revise o diff antes do commit", "tem algum problema nesta mudança"],
  "gerador-testes": ["escreva testes para este módulo", "cubra este bug com teste de regressão", "aumente a cobertura antes de refatorar"],
  "seguranca-owasp": ["audite a segurança das rotas", "verifique OWASP antes do lançamento", "revise autenticação e permissões"],
  "documentacao-tecnica": ["atualize o README", "documente a arquitetura", "escreva o guia de setup local"],
  "changelog-release": ["escreva o changelog desta versão", "notas de versão para clientes", "qual deve ser a próxima versão"],
  "triagem-bugs": ["investigue este erro", "a página dá erro 500", "reproduza e corrija este bug"],
  "performance-web": ["a página está lenta", "melhore a nota do Lighthouse", "esta consulta demora muito"],
  "analista-dados-sql": ["escreva a consulta SQL para", "quantos usuários ativaram por semana", "otimize esta query"],
  "arquiteto-produto": ["proponha a arquitetura", "qual stack usar", "registre as decisões técnicas (ADR)"],
  "definicao-mvp": ["corte o escopo do MVP", "o que fica fora da primeira versão", "histórias do MVP"],
  "modelagem-dados": ["altere o schema do banco", "crie a migração para esta tabela", "modele as entidades e relacionamentos"],
  "design-system-ui": ["crie os componentes base", "padronize as telas", "defina cores e tipografia com contraste AA"],
  "planejamento-deploy": ["prepare o primeiro deploy", "configure o CI", "separe os ambientes de teste e produção"],
};

/** Description final do agente: quando usar + exemplos de pedido. */
export function agentDescription(whenToUse: string, id: string): string {
  const t = AGENT_TRIGGERS[id] ?? [];
  return t.length ? `${whenToUse} Exemplos de pedido: ${t.map((x) => `"${x}"`).join(", ")}.` : whenToUse;
}
