import type { SkillInput } from "./schema";

export const skillsInput: SkillInput[] = [
  {
    id: "escrever-prd",
    name: "Escrever PRD",
    category: "Produto",
    description:
      "Escreve um PRD (documento de requisitos de produto) completo e verificável a partir de uma ideia de funcionalidade. Use quando o usuário pedir um PRD, especificação, requisitos ou 'documento da feature' antes de construir algo.",
    summary: "Gera PRDs com problema, objetivos, escopo, requisitos e critérios de aceite.",
    example: "Escreva um PRD para o recurso de convites de equipe.",
    tags: ["prd", "requisitos"],
    appliesTo: "ambos",
    stages: ["ideia", "mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Escrever PRD

## Quando usar
Quando alguém pedir para especificar uma funcionalidade antes de construir.

## Passos
1. Faça no máximo 4 perguntas para fechar as lacunas: problema, quem sofre com ele, evidência e objetivo mensurável.
2. Leia o código relacionado para entender o que já existe e as restrições técnicas.
3. Copie o modelo [template-prd.md](template-prd.md) para \`docs/prd/<nome-da-feature>.md\` e preencha todas as seções.
4. Escreva cada requisito como comportamento observável e associe um critério de aceite testável.
5. Preencha "Fora de escopo" com pelo menos 3 itens. Isso evita discussões depois.
6. Liste as perguntas em aberto com um responsável sugerido.
7. Mostre o resumo ao usuário e pergunte se algo ficou ambíguo.

## Regras
- Descreva o quê e o porquê. Só descreva o como quando houver restrição técnica real.
- Marque premissas não validadas com **(premissa)**.
- Mantenha o PRD curto: se passar de duas páginas, divida em fases.`,
    files: [
      {
        path: "template-prd.md",
        content: `# PRD: <nome da funcionalidade>

**Autor:** <nome> · **Status:** rascunho · **Data:** <AAAA-MM-DD>

## Contexto
<Por que isso importa agora? Qual evidência temos?>

## Problema
<Quem sofre, em que situação, e qual o custo de não resolver.>

## Objetivos e métricas
| Objetivo | Métrica | Meta |
|---|---|---|
| | | |

## Fora de escopo
-

## Histórias de usuário
- Como <persona>, quero <ação> para <resultado>.

## Requisitos e critérios de aceite
| # | Requisito | Critério de aceite |
|---|---|---|
| R1 | | Dado ..., quando ..., então ... |

## Requisitos não funcionais
Performance, segurança, privacidade (LGPD), acessibilidade.

## Riscos e dependências
-

## Perguntas em aberto
| Pergunta | Responsável |
|---|---|

## Plano de lançamento
<Feature flag? Beta? Comunicação?>
`,
      },
    ],
  },
  {
    id: "checklist-lancamento",
    name: "Checklist de lançamento",
    category: "Produto",
    description:
      "Conduz um checklist completo antes de lançar uma versão, funcionalidade ou produto: técnico, legal, comunicação e suporte. Use quando o usuário falar em lançar, publicar, go-live, colocar no ar ou anunciar algo.",
    summary: "Verifica produto, infraestrutura, legal, comunicação e suporte antes do lançamento.",
    example: "Rode o checklist de lançamento para a versão 1.0.",
    tags: ["lançamento", "go-live"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Checklist de lançamento

## Quando usar
Antes de qualquer lançamento público: produto novo, versão maior ou funcionalidade relevante.

## Passos
1. Pergunte o que será lançado, a data e o público.
2. Percorra o arquivo [checklist.md](checklist.md) item por item.
3. Para cada item, verifique no projeto sempre que possível (rodar testes, conferir variáveis, ler páginas) e marque: ✅ ok, ⚠️ parcial, ❌ pendente, ➖ não se aplica.
4. Para itens que dependem de pessoas (aprovação jurídica, comunicação), pergunte ao usuário em vez de supor.
5. Gere um relatório com os pendentes ordenados por risco e um responsável sugerido.
6. Recomende: lançar, lançar com ressalvas ou adiar, com justificativa.

## Regras
- Não marque como ok o que não foi verificado.
- Itens de segurança e privacidade pendentes são sempre bloqueantes.`,
    files: [
      {
        path: "checklist.md",
        content: `# Checklist de lançamento

## Produto
- [ ] Fluxo principal testado de ponta a ponta em produção ou ambiente idêntico
- [ ] Estados vazios, de erro e de carregamento revisados
- [ ] Textos revisados (ortografia, tom, sem placeholders esquecidos)
- [ ] Funciona em celular e nos navegadores principais

## Técnico
- [ ] Testes, lint e build passando
- [ ] Variáveis de ambiente de produção configuradas
- [ ] Migrações aplicadas e com plano de reversão
- [ ] Monitoramento de erros e alertas ativos
- [ ] Backup do banco verificado
- [ ] Plano de rollback documentado

## Segurança e privacidade
- [ ] Nenhum segredo no repositório
- [ ] Controle de acesso revisado nas rotas novas
- [ ] Política de privacidade e termos atualizados (revisados por advogado)
- [ ] Consentimentos e descadastro funcionando

## Comunicação
- [ ] Notas de versão escritas
- [ ] Anúncio (e-mail, redes, blog) pronto
- [ ] Página de preços e landing atualizadas

## Suporte
- [ ] Artigos de ajuda publicados
- [ ] Time de suporte avisado e treinado
- [ ] Canal para reportar problemas definido
`,
      },
    ],
  },
  {
    id: "revisao-pr",
    name: "Revisão de PR",
    category: "Engenharia",
    description:
      "Revisa um pull request ou diff com os critérios do projeto: correção, segurança, testes, legibilidade e convenções. Use quando o usuário pedir review, revisão de código, revisar PR ou conferir mudanças antes de commitar.",
    summary: "Revisa diffs com critérios fixos e severidade por achado.",
    example: "Revise o PR atual com os critérios do projeto.",
    tags: ["code review", "pull request"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Revisão de PR

## Quando usar
Ao revisar um pull request, um branch ou as mudanças locais antes do commit.

## Passos
1. Obtenha as mudanças: \`git diff\` para mudanças locais ou \`git diff main...HEAD\` para o branch (ajuste o nome do branch principal).
2. Leia o CLAUDE.md para conhecer as convenções do projeto.
3. Revise na ordem dos [criterios.md](criterios.md). Pare para entender o contexto de cada arquivo alterado.
4. Para cada achado, registre: \`arquivo:linha\`, severidade (🔴 bloqueante, 🟡 importante, 🔵 sugestão), problema e correção sugerida.
5. Feche com um veredito: aprovar, aprovar com ajustes ou pedir mudanças.

## Regras
- Não edite arquivos durante a revisão, a menos que o usuário peça.
- Não comente gosto pessoal que as convenções do projeto não cobrem.
- Elogie o que estiver bem feito em uma linha. Ajuda a calibrar o review.`,
    files: [
      {
        path: "criterios.md",
        content: `# Critérios de revisão (em ordem de prioridade)

1. **Correção:** a lógica faz o que promete? Casos de borda, nulos, erros e concorrência.
2. **Segurança:** validação de entrada, autorização por recurso, segredos, injeção, dados pessoais em logs.
3. **Dados:** migrações reversíveis, índices, integridade, compatibilidade com dados existentes.
4. **Testes:** o comportamento novo tem teste? Os testes falhariam se o código quebrasse?
5. **Legibilidade:** nomes claros, funções pequenas, sem código morto ou comentários desatualizados.
6. **Convenções:** segue o padrão do projeto (estrutura, estilo, mensagens de commit).
7. **Performance:** consultas N+1, loops desnecessários, payloads grandes.
`,
      },
    ],
  },
  {
    id: "checklist-lgpd",
    name: "Checklist LGPD",
    category: "Jurídico e compliance",
    description:
      "Verifica o produto contra os pontos práticos da LGPD: dados coletados, base legal, consentimento, direitos do titular, retenção e segurança. Use quando o usuário mencionar LGPD, privacidade, dados pessoais, consentimento ou política de privacidade. Não substitui advogado.",
    summary: "Mapeia dados pessoais e verifica os pontos práticos da LGPD no código.",
    example: "Rode o checklist LGPD no módulo de cadastro.",
    tags: ["lgpd", "privacidade"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "médio",
    body: `# Checklist LGPD

> Esta skill gera um diagnóstico técnico. Não é parecer jurídico e não substitui um advogado.

## Passos
1. Procure no código e no schema onde dados pessoais são coletados, armazenados, enviados a terceiros e registrados em logs.
2. Monte a tabela: dado, finalidade, base legal provável, onde fica, quem acessa, retenção, compartilhado com.
3. Percorra o [checklist.md](checklist.md) e marque cada item com evidência (arquivo ou tela).
4. Destaque dados sensíveis (saúde, biometria, origem racial, religião etc.) e de crianças e adolescentes: exigem cuidado redobrado.
5. Liste as correções técnicas priorizadas e as perguntas para o advogado.

## Regras
- Nunca afirme que o produto "está em conformidade".
- Não copie dados reais de usuários para o relatório.`,
    files: [
      {
        path: "checklist.md",
        content: `# Checklist LGPD (pontos práticos)

- [ ] Inventário de dados pessoais atualizado
- [ ] Cada finalidade tem base legal definida
- [ ] Coleta mínima: nenhum campo sem uso claro
- [ ] Consentimento livre, informado e registrável quando essa for a base legal
- [ ] Opção de revogar consentimento e descadastrar com facilidade
- [ ] Política de privacidade acessível e em linguagem simples
- [ ] Canal do encarregado (DPO) publicado
- [ ] Processo para atender direitos do titular (acesso, correção, exclusão, portabilidade)
- [ ] Prazos de retenção definidos e exclusão aplicada
- [ ] Dados pessoais fora dos logs ou mascarados
- [ ] Criptografia em trânsito (HTTPS) e senhas com hash forte
- [ ] Contratos com operadores (fornecedores) que tratam dados
- [ ] Plano de resposta a incidentes com comunicação à ANPD quando cabível
`,
      },
    ],
  },
  {
    id: "commits-changelog",
    name: "Padrão de commits e changelog",
    category: "Engenharia",
    description:
      "Aplica Conventional Commits nas mensagens e mantém o CHANGELOG.md no formato Keep a Changelog. Use quando o usuário pedir para commitar, escrever mensagem de commit, atualizar changelog ou preparar notas de versão.",
    summary: "Mensagens de commit padronizadas e changelog sempre atualizado.",
    example: "Escreva a mensagem de commit e atualize o changelog.",
    tags: ["git", "commits", "changelog"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    overlapsWith: ["versionamento"],
    body: `# Padrão de commits e changelog

## Mensagens de commit (Conventional Commits)
Formato: \`<tipo>(<escopo opcional>): <descrição no imperativo>\`

Tipos: \`feat\`, \`fix\`, \`docs\`, \`refactor\`, \`test\`, \`chore\`, \`perf\`, \`ci\`, \`build\`.
Mudança incompatível: adicione \`!\` depois do tipo e explique no rodapé \`BREAKING CHANGE:\`.

## Passos para commitar
1. Rode \`git status\` e \`git diff --staged\` para ver o que vai no commit.
2. Se houver mudanças de assuntos diferentes, sugira separar em commits menores.
3. Escreva a mensagem: assunto com até 72 caracteres, corpo explicando o porquê.
4. Confirme com o usuário antes de rodar \`git commit\`.

## Changelog (Keep a Changelog)
1. Mantenha uma seção \`## [Não lançado]\` no topo do CHANGELOG.md.
2. Adicione cada mudança relevante para quem usa em: Adicionado, Alterado, Obsoleto, Removido, Corrigido, Segurança.
3. Ao lançar, renomeie a seção para \`## [x.y.z] - AAAA-MM-DD\`.

## Regras
- Nunca inclua segredos, dados de clientes ou detalhes de vulnerabilidade não corrigida.
- Nada de \`git push\` ou \`--force\` sem pedido explícito.`,
  },
  {
    id: "post-mortem",
    name: "Post-mortem de incidente",
    category: "Operações",
    description:
      "Conduz um post-mortem sem culpados após um incidente: linha do tempo, impacto, causa raiz, o que funcionou e ações. Use quando o usuário mencionar post-mortem, incidente resolvido, queda, outage ou análise de causa raiz.",
    summary: "Post-mortem sem culpados com linha do tempo, causa raiz e ações.",
    example: "Monte o post-mortem da queda de ontem no checkout.",
    tags: ["incidente", "post-mortem"],
    appliesTo: "ambos",
    stages: ["primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Post-mortem de incidente

## Passos
1. Colete os fatos: alertas, logs, mensagens do canal de incidente, commits e deploys do período.
2. Monte a linha do tempo com horários (detecção, escalada, mitigação, resolução).
3. Quantifique o impacto: duração, usuários afetados, receita, dados.
4. Encontre a causa raiz com a técnica dos 5 porquês, chegando a falhas de processo ou sistema.
5. Registre o que funcionou bem e o que dificultou a resposta.
6. Defina ações com responsável, prazo e tipo (prevenir, detectar mais cedo, mitigar mais rápido).
7. Preencha o [template.md](template.md) em \`docs/incidentes/AAAA-MM-DD-<titulo>.md\`.

## Regras
- Sem culpados: descreva decisões no contexto da informação disponível na hora.
- Não inclua dados pessoais de clientes nem segredos.`,
    files: [
      {
        path: "template.md",
        content: `# Post-mortem: <título>

**Data:** <AAAA-MM-DD> · **Severidade:** <SEV1-4> · **Status:** rascunho

## Resumo
<2 a 3 frases: o que aconteceu, impacto e como foi resolvido.>

## Impacto
- Duração:
- Usuários afetados:
- Impacto financeiro/dados:

## Linha do tempo
| Horário | Evento |
|---|---|

## Causa raiz
<5 porquês até chegar à causa de sistema ou processo.>

## O que funcionou bem
-

## O que dificultou
-

## Ações
| Ação | Tipo | Responsável | Prazo |
|---|---|---|---|
`,
      },
    ],
  },
  {
    id: "analise-funil",
    name: "Análise de funil",
    category: "Dados e métricas",
    description:
      "Analisa um funil de conversão etapa por etapa, encontra o maior vazamento e propõe experimentos. Use quando o usuário falar de funil, conversão, onde os usuários desistem, taxa de cadastro ou ativação.",
    summary: "Encontra o maior vazamento do funil e propõe experimentos.",
    example: "Analise o funil do cadastro até o primeiro pagamento.",
    tags: ["funil", "conversão", "analytics"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "médio",
    body: `# Análise de funil

## Passos
1. Defina o funil com o usuário: etapas, evento que marca cada uma e janela de tempo.
2. Verifique se os eventos existem no código ou na ferramenta de analytics; liste os que faltam.
3. Calcule a conversão de cada etapa e a acumulada. Mostre a tabela.
4. Segmente quando houver dados: origem, dispositivo, plano, coorte de cadastro.
5. Identifique a etapa com maior perda absoluta e levante hipóteses do porquê (olhe a tela e o fluxo no código).
6. Proponha até 3 experimentos com hipótese, mudança, métrica e tamanho de amostra aproximado.

## Formato da tabela
| Etapa | Usuários | Conversão da etapa | Conversão acumulada |
|---|---|---|---|

## Regras
- Diferencie dado medido de hipótese.
- Não tire conclusões de amostras muito pequenas; diga quando for o caso.
- Use dados agregados, nunca listas de usuários.`,
  },
  {
    id: "escrita-email-lifecycle",
    name: "E-mail de lifecycle",
    category: "Marketing",
    description:
      "Escreve e-mails de ciclo de vida (boas-vindas, ativação, reativação, upgrade, cobrança) com assunto, pré-cabeçalho, corpo e CTA. Use quando o usuário pedir para escrever e-mails automáticos, sequências ou réguas de relacionamento.",
    summary: "E-mails de ciclo de vida com gatilho, assunto e CTA único.",
    example: "Escreva a sequência de boas-vindas de 3 e-mails.",
    tags: ["email", "lifecycle"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# E-mail de lifecycle

## Passos
1. Confirme o gatilho (evento ou tempo), o público e o objetivo do e-mail.
2. Leia o tom da marca no CLAUDE.md.
3. Para cada e-mail, entregue no formato abaixo.
4. Revise: uma ideia, um CTA, frases curtas, nada de urgência falsa.

## Formato
\`\`\`
Gatilho:
Público:
Objetivo:
Assunto (3 opções):
Pré-cabeçalho:
Corpo:
CTA (texto do botão + destino):
Condição de saída:
\`\`\`

## Gatilhos mais comuns
- **Boas-vindas:** logo após o cadastro, reforça o primeiro passo.
- **Ativação:** 24 a 72 horas sem o evento de ativação.
- **Reativação:** 14 a 30 dias sem uso.
- **Upgrade:** atingiu limite do plano ou usou um recurso de plano superior.
- **Cobrança:** pagamento falhou ou cartão vai expirar.

## Regras
- Use variáveis com valor padrão: \`{{primeiro_nome | "olá"}}\`.
- Sempre inclua descadastro e identificação do remetente (LGPD).
- Não prometa o que o produto não entrega.`,
  },
  {
    id: "auditoria-seo-on-page",
    name: "Auditoria de SEO on-page",
    category: "Marketing",
    description:
      "Audita páginas do site no código: title, meta description, headings, URLs, imagens, links internos, dados estruturados e performance básica. Use quando o usuário pedir auditoria de SEO, otimizar uma página para busca ou revisar metadados.",
    summary: "Audita metadados, headings, imagens e links das páginas no código.",
    example: "Faça uma auditoria de SEO on-page das páginas públicas.",
    tags: ["seo", "auditoria"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Auditoria de SEO on-page

## Passos
1. Liste as páginas públicas a partir das rotas do projeto.
2. Para cada página, verifique os itens de [checklist.md](checklist.md) lendo o código (componentes de metadata, templates).
3. Monte a tabela: página, item, situação, correção sugerida.
4. Priorize por impacto: páginas de maior tráfego ou conversão primeiro.
5. Se o usuário aprovar, aplique as correções simples (metadados, alt, headings).

## Regras
- Não invente palavras-chave com volume; sugira validação em ferramenta de SEO.
- Não altere URLs públicas sem planejar redirecionamentos 301.`,
    files: [
      {
        path: "checklist.md",
        content: `# Checklist de SEO on-page

- [ ] \`<title>\` único, até ~60 caracteres, com o termo principal
- [ ] Meta description única, até ~155 caracteres, com benefício claro
- [ ] Um único H1 e hierarquia lógica de H2/H3
- [ ] URL curta, legível, em minúsculas e com hífens
- [ ] Imagens com \`alt\` descritivo e dimensões definidas
- [ ] Links internos para páginas relacionadas
- [ ] Canonical definido em páginas com variações
- [ ] Open Graph e Twitter Card
- [ ] Dados estruturados (JSON-LD) quando aplicável
- [ ] \`robots.txt\` e \`sitemap.xml\` presentes
- [ ] Página indexável (sem \`noindex\` acidental)
- [ ] Conteúdo carregado sem depender só de JavaScript no cliente
`,
      },
    ],
  },
  {
    id: "seguranca-pre-deploy",
    name: "Checklist de segurança antes do deploy",
    category: "Engenharia",
    description:
      "Roda uma verificação de segurança antes de cada deploy: segredos, dependências, headers, autenticação, autorização e dados expostos. Use quando o usuário for fazer deploy, publicar em produção ou pedir uma checagem rápida de segurança.",
    summary: "Checagem rápida de segredos, dependências, headers e acesso antes do deploy.",
    example: "Rode a checagem de segurança antes do deploy de hoje.",
    tags: ["segurança", "deploy"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Checklist de segurança antes do deploy

## Passos
1. **Segredos:** procure chaves e tokens no diff e no repositório (\`git diff\`, busca por padrões como \`sk-\`, \`ghp_\`, \`-----BEGIN\`). Confirme que \`.env\` está no \`.gitignore\`.
2. **Dependências:** rode o auditor do ecossistema (ex.: \`npm audit --omit=dev\`) e avalie vulnerabilidades altas e críticas.
3. **Rotas novas:** para cada rota ou endpoint alterado, confirme autenticação e autorização por recurso.
4. **Entradas:** confirme validação de entrada no servidor.
5. **Headers e cookies:** CSP, HSTS, X-Content-Type-Options, cookies \`HttpOnly\`, \`Secure\`, \`SameSite\`.
6. **Dados:** respostas de API não expõem campos internos nem dados de outros usuários; logs não têm dados pessoais.
7. **Variáveis do cliente:** nenhuma chave secreta com prefixo público (ex.: \`NEXT_PUBLIC_\`, \`VITE_\`).
8. Reporte: ✅ ok, ⚠️ atenção, ❌ bloqueia o deploy.

## Regras
- Nunca imprima o valor de um segredo encontrado; mostre só arquivo e linha.
- Qualquer ❌ bloqueia o deploy até ser resolvido.`,
  },
  {
    id: "metricas-sucesso",
    name: "Definição de métricas de sucesso",
    category: "Dados e métricas",
    description:
      "Define a métrica norte, métricas de entrada e métricas de proteção para o produto ou uma funcionalidade, com fórmula e fonte de dados. Use quando o usuário perguntar como medir sucesso, quais KPIs acompanhar ou como saber se algo funcionou.",
    summary: "Métrica norte, métricas de entrada e de proteção com fórmulas.",
    example: "Defina as métricas de sucesso do novo onboarding.",
    tags: ["kpi", "métricas"],
    appliesTo: "ambos",
    stages: ["ideia", "mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Definição de métricas de sucesso

## Passos
1. Pergunte o objetivo de negócio (ex.: aumentar retenção, receita, ativação).
2. Proponha a **métrica norte**: a que melhor representa o valor entregue ao cliente.
3. Liste 3 a 5 **métricas de entrada** que o time consegue mover e que puxam a métrica norte.
4. Liste 1 a 3 **métricas de proteção** que não podem piorar (ex.: churn, tickets, tempo de carregamento).
5. Para cada métrica, preencha a tabela abaixo.
6. Verifique se os eventos necessários existem no código; liste os que precisam ser instrumentados.

## Tabela
| Métrica | Tipo | Fórmula | Fonte | Frequência | Meta |
|---|---|---|---|---|---|

## Exemplo (SaaS de agendamento B2B)
- Métrica norte: agendamentos concluídos por conta ativa por semana.
- Entrada: contas que conectaram o calendário, links de agendamento compartilhados, lembretes enviados.
- Proteção: taxa de cancelamento de assinatura, tickets por conta, tempo de resposta da página.

## Regras
- Evite métricas de vaidade (visitas totais, cadastros sem ativação).
- Toda métrica tem fórmula exata e fonte de dados.`,
  },
  {
    id: "documentacao-api",
    name: "Documentação de API",
    category: "Engenharia",
    description:
      "Documenta endpoints de API a partir do código: método, rota, autenticação, parâmetros, exemplos de requisição e resposta, e erros. Use quando o usuário pedir documentação de API, referência de endpoints ou especificação OpenAPI.",
    summary: "Referência de endpoints com exemplos e erros, gerada do código.",
    example: "Documente todos os endpoints da pasta de API.",
    tags: ["api", "documentação", "openapi"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "médio",
    body: `# Documentação de API

## Passos
1. Encontre as rotas da API no código e liste método e caminho de cada uma.
2. Para cada rota, leia o handler e o schema de validação para extrair parâmetros, corpo e respostas.
3. Documente no formato abaixo, em \`docs/api.md\` (ou gere \`openapi.yaml\` se o usuário preferir).
4. Inclua exemplos realistas com dados fictícios.
5. Liste rotas sem validação de entrada ou sem autenticação como alerta no final.

## Formato por endpoint
\`\`\`
### POST /api/recurso
Descrição curta.
Autenticação: <tipo>
Corpo: tabela de campos (nome, tipo, obrigatório, descrição)
Exemplo de requisição
Exemplo de resposta (200)
Erros: 400, 401, 403, 404, 429, 500 com significado
\`\`\`

## Regras
- Documente o comportamento real do código, não o desejado.
- Nunca use tokens ou chaves reais nos exemplos.`,
  },
  {
    id: "plano-testes",
    name: "Plano de testes",
    category: "Engenharia",
    description:
      "Monta um plano de testes para uma funcionalidade ou versão: o que testar, em que nível (unitário, integração, E2E), casos de borda e critérios de saída. Use quando o usuário pedir plano de testes, estratégia de QA ou o que testar antes de lançar.",
    summary: "Plano de testes por nível com casos de borda e critério de saída.",
    example: "Crie o plano de testes para o checkout.",
    tags: ["testes", "qa"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Plano de testes

## Passos
1. Leia o PRD ou a descrição da funcionalidade e o código envolvido.
2. Liste os riscos: o que mais pode dar errado e o que mais custaria caro se desse.
3. Distribua os casos pela pirâmide: muitos unitários, alguns de integração, poucos E2E para fluxos críticos.
4. Escreva os casos na tabela abaixo, incluindo caminho feliz, bordas, erros e permissões.
5. Defina dados de teste fictícios e ambiente.
6. Defina o critério de saída (ex.: 100% dos casos críticos passando, nenhum bug alto aberto).

## Tabela
| ID | Cenário | Nível | Pré-condição | Passos | Resultado esperado | Prioridade |
|---|---|---|---|---|---|---|

## Casos que costumam ser esquecidos
- Usuário sem permissão tentando acessar o recurso de outro usuário ou outra conta.
- Campos vazios, muito longos, com acentos, emojis e espaços nas pontas.
- Dupla submissão (clique duplo, voltar e reenviar).
- Falha de serviço externo (pagamento, e-mail) e tempo esgotado.
- Fuso horário e virada de mês em datas.

## Regras
- Priorize por risco, não por facilidade.
- Inclua acessibilidade e celular nos fluxos de interface.`,
  },
  {
    id: "copy-precos",
    name: "Copy de preços e planos",
    category: "Marketing",
    description:
      "Escreve a página de preços: nomes de planos, descrição para quem é cada um, lista de recursos, destaque, FAQ de cobrança e CTAs. Use quando o usuário pedir texto de página de preços, nomes de planos ou comparação de planos.",
    summary: "Textos claros para página de preços e comparação de planos.",
    example: "Escreva a página de preços com 3 planos.",
    tags: ["preços", "copy"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Copy de preços e planos

## Passos
1. Obtenha a estrutura de planos e preços (pergunte se não estiver no projeto). Não invente valores.
2. Para cada plano, escreva: nome, frase "para quem é", preço com periodicidade, 4 a 6 recursos-chave e CTA.
3. Destaque o plano recomendado com um motivo honesto.
4. Escreva a tabela comparativa com recursos agrupados por tema.
5. Escreva a FAQ de cobrança: teste grátis, cancelamento, troca de plano, formas de pagamento, nota fiscal, reembolso.
6. Revise: preços com impostos claros, sem asteriscos escondidos.

## Estrutura de cada cartão de plano
\`\`\`
Nome do plano
Para quem é: <uma frase>
Preço: R$ <valor>/mês (ou /ano, com economia em reais)
Inclui: 4 a 6 itens, começando pelo mais valioso
CTA: <ação exata>
\`\`\`

## Regras
- Nunca invente preços, descontos ou números de clientes.
- Cancelamento descrito de forma clara e simples (Código de Defesa do Consumidor).
- O CTA diz o que acontece: "Começar teste grátis de 14 dias", não "Enviar".`,
  },
  {
    id: "roteiro-entrevista",
    name: "Roteiro de entrevista com usuário",
    category: "Produto",
    description:
      "Cria roteiros de entrevista com clientes ou potenciais clientes que revelam comportamento real, sem perguntas indutivas, e sintetiza as respostas. Use quando o usuário quiser entrevistar clientes, validar uma ideia ou entender por que compram ou cancelam.",
    summary: "Roteiros sem viés e síntese de entrevistas com citações anonimizadas.",
    example: "Crie um roteiro para entrevistar clientes que cancelaram.",
    tags: ["pesquisa", "entrevista"],
    appliesTo: "ambos",
    stages: ["ideia", "mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Roteiro de entrevista com usuário

## Montar o roteiro
1. Escreva o objetivo da pesquisa em uma frase e as decisões que dependem dela.
2. Estruture: abertura e consentimento (2 min), contexto (5 min), história da última vez que o problema aconteceu (15 min), alternativas usadas (5 min), encerramento (3 min).
3. Use perguntas sobre o passado: "Conte da última vez que...", "O que você fez em seguida?", "Quanto isso custou?".
4. Evite: perguntas hipotéticas ("você usaria?"), indutivas ("não seria ótimo se...?") e de sim/não.

## Sintetizar
1. Anonimize os participantes (P1, P2...).
2. Extraia trechos relevantes e agrupe por tema.
3. Conte a recorrência de cada tema.
4. Escreva insights: observação, evidência (citações) e implicação.

## Regras
- Sempre peça consentimento para gravar.
- Não apresente a solução durante a entrevista de descoberta.`,
  },
  {
    id: "plano-onboarding",
    name: "Plano de onboarding",
    category: "Produto",
    description:
      "Desenha o onboarding do produto: momento 'aha', evento de ativação, checklist inicial, telas vazias úteis e mensagens dos primeiros dias. Use quando o usuário falar em onboarding, primeiro acesso, ativação ou novos usuários que não voltam.",
    summary: "Momento 'aha', checklist de ativação e mensagens dos primeiros dias.",
    example: "Crie o plano de onboarding para novos cadastros.",
    tags: ["onboarding", "ativação"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "médio",
    body: `# Plano de onboarding

## Passos
1. Defina o momento "aha" em uma frase e o evento mensurável que o representa.
2. Percorra o fluxo do cadastro até esse evento no código ou na interface, contando passos e campos.
3. Corte atrito: remova campos, adie configurações, ofereça dados de exemplo.
4. Crie o checklist de primeiros passos (3 a 5 itens) com o benefício de cada um.
5. Reescreva as telas vazias para orientar a próxima ação.
6. Escreva as mensagens dos dias 0, 1, 3 e 7 (in-app ou e-mail) com gatilho e condição de saída.
7. Defina métricas: taxa de ativação, tempo até ativação e retenção na semana 1.

## Entregável
Um arquivo \`docs/onboarding.md\` com: momento "aha", evento de ativação, mapa do fluxo atual (passos e campos), mudanças propostas em ordem de impacto, textos do checklist, textos das telas vazias e mensagens por dia.

## Regras
- Uma ação principal por tela.
- Não peça dados que não serão usados no primeiro uso.
- Teste o fluxo em celular.`,
  },
  {
    id: "runbook-incidentes",
    name: "Runbook de incidentes",
    category: "Operações",
    description:
      "Guia a resposta a um incidente em andamento e cria runbooks para falhas conhecidas: severidade, papéis, comunicação, diagnóstico e mitigação. Use quando algo estiver fora do ar, com erro em produção, ou quando o usuário pedir um runbook.",
    summary: "Resposta a incidentes passo a passo e runbooks para falhas conhecidas.",
    example: "O site está fora do ar, siga o runbook de incidentes.",
    tags: ["incidente", "runbook", "on-call"],
    appliesTo: "ambos",
    stages: ["primeiros-clientes", "crescimento"],
    effort: "médio",
    body: `# Runbook de incidentes

## Durante um incidente
1. **Classifique a severidade:** SEV1 (fora do ar ou perda de dados), SEV2 (função crítica degradada), SEV3 (problema parcial), SEV4 (menor).
2. **Defina papéis:** quem coordena, quem investiga, quem comunica.
3. **Mitigue primeiro, investigue depois:** rollback do último deploy, desligar feature flag, escalar recursos.
4. **Diagnostique:** últimos deploys, logs de erro, métricas, status dos fornecedores.
5. **Comunique:** atualização a cada 30 minutos para SEV1/SEV2 (interno e página de status).
6. **Encerre:** confirme a resolução, registre a linha do tempo e agende o post-mortem.

## Criar um runbook para uma falha conhecida
Use o modelo [template-runbook.md](template-runbook.md) e salve em \`docs/runbooks/\`.

## Regras
- Peça confirmação antes de qualquer ação em produção (rollback, restart, migração).
- Nunca cole segredos ou dados de clientes no canal do incidente.`,
    files: [
      {
        path: "template-runbook.md",
        content: `# Runbook: <nome da falha>

## Sintomas
<Como a falha aparece: alertas, erros, relatos de clientes.>

## Impacto
<Quem é afetado e quão grave.>

## Diagnóstico
1. <Comando ou painel para confirmar>
2.

## Mitigação
1. <Ação reversível primeiro>
2.

## Correção definitiva
<Link para a issue ou o passo a passo.>

## Comunicação
<Modelo de mensagem para clientes.>

## Responsáveis
<Time ou pessoa de referência.>
`,
      },
    ],
  },
  {
    id: "backlog-feedback",
    name: "Backlog a partir de feedback",
    category: "Produto",
    description:
      "Transforma feedback bruto de clientes (tickets, entrevistas, avaliações, mensagens) em temas, problemas e itens de backlog priorizados. Use quando o usuário colar feedback, pedir para organizar sugestões ou transformar reclamações em tarefas.",
    summary: "Agrupa feedback em temas e gera itens de backlog priorizados.",
    example: "Transforme estes 50 feedbacks em itens de backlog.",
    tags: ["feedback", "backlog"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Backlog a partir de feedback

## Passos
1. Remova dados pessoais do feedback antes de processar (nomes, e-mails, telefones).
2. Classifique cada item: bug, dúvida de uso, pedido de funcionalidade, elogio, reclamação de preço.
3. Agrupe pedidos e reclamações em temas e escreva o **problema** por trás de cada tema (não a solução pedida).
4. Conte a recorrência e note o perfil de quem pediu (plano, segmento) quando disponível.
5. Para cada tema, crie um item de backlog: título, problema, evidência (contagem e 2 citações), impacto estimado e sugestão de solução.
6. Ordene por recorrência x impacto e destaque os bugs.

## Formato do item de backlog
\`\`\`
Título: <problema em linguagem do cliente>
Problema: <o que o cliente não consegue fazer e por quê>
Evidência: <n> menções · "<citação 1>" · "<citação 2>"
Impacto estimado: alto | médio | baixo
Sugestão: <solução inicial, aberta a alternativas>
\`\`\`

## Regras
- Feedback é sinal, não ordem: registre o problema, não apenas a solução pedida.
- Dúvidas de uso recorrentes viram melhoria de interface ou artigo de ajuda.`,
  },
  {
    id: "versionamento",
    name: "Política de versionamento",
    category: "Engenharia",
    description:
      "Define e aplica versionamento semântico (SemVer) para o produto, a API ou pacotes: quando subir major, minor e patch, e como comunicar quebras. Use quando o usuário perguntar que versão lançar, como versionar a API ou como tratar mudanças incompatíveis.",
    summary: "Regras de SemVer, versionamento de API e comunicação de quebras.",
    example: "Qual deve ser a próxima versão com base nestas mudanças?",
    tags: ["semver", "versionamento", "api"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    overlapsWith: ["commits-changelog"],
    body: `# Política de versionamento

## Regras do SemVer (MAJOR.MINOR.PATCH)
- **MAJOR:** mudança incompatível (remover campo, mudar comportamento esperado, renomear endpoint).
- **MINOR:** funcionalidade nova compatível.
- **PATCH:** correção compatível.

## Passos para decidir a próxima versão
1. Liste as mudanças desde a última tag (\`git log <ultima-tag>..HEAD\`).
2. Classifique cada uma como quebra, funcionalidade ou correção.
3. A maior classificação define a versão.
4. Se houver quebra, escreva o guia de migração e o prazo de suporte da versão anterior.

## API pública
- Versione no caminho (\`/v1/\`) ou em header, e seja consistente.
- Marque campos obsoletos antes de remover e comunique com antecedência.

## Regras
- Não crie tags nem publique sem confirmação.
- Antes da 1.0.0, deixe claro que a API pode mudar.`,
  },
  {
    id: "checklist-acessibilidade",
    name: "Checklist de acessibilidade",
    category: "Design e UI",
    description:
      "Audita telas e componentes contra os pontos principais da WCAG 2.2 nível AA: contraste, teclado, foco, rótulos, semântica e movimento. Use quando o usuário pedir revisão de acessibilidade, a11y, WCAG ou antes de publicar uma tela nova.",
    summary: "Auditoria WCAG AA de telas e componentes, com correções.",
    example: "Audite a acessibilidade do formulário de cadastro.",
    tags: ["acessibilidade", "wcag", "a11y"],
    appliesTo: "ambos",
    stages: ["mvp", "primeiros-clientes", "crescimento"],
    effort: "médio",
    body: `# Checklist de acessibilidade

## Passos
1. Liste as telas ou componentes a auditar.
2. Percorra o [checklist.md](checklist.md) lendo o código de cada componente.
3. Para cada falha, registre: local, critério WCAG, impacto para quem usa e correção.
4. Corrija os itens simples com aprovação do usuário (rótulos, alt, foco, atributos ARIA corretos).
5. Recomende teste manual com leitor de tela e só teclado nos fluxos críticos.

## Regras
- Prefira HTML semântico a ARIA.
- Uma auditoria por código não substitui teste com pessoas com deficiência.`,
    files: [
      {
        path: "checklist.md",
        content: `# Checklist de acessibilidade (WCAG 2.2 AA, pontos principais)

## Percepção
- [ ] Contraste de texto ≥ 4.5:1 (texto grande ≥ 3:1)
- [ ] Contraste de componentes e foco ≥ 3:1
- [ ] Imagens informativas com \`alt\`; decorativas com \`alt=""\`
- [ ] Informação não depende só de cor

## Operação
- [ ] Tudo funciona só com teclado, sem armadilhas de foco
- [ ] Foco visível em todos os elementos interativos
- [ ] Ordem de foco lógica
- [ ] Alvos de toque com pelo menos 24×24 px
- [ ] Movimento respeita \`prefers-reduced-motion\`

## Compreensão
- [ ] Campos com \`<label>\` associado
- [ ] Erros explicados em texto e ligados ao campo
- [ ] Idioma da página definido (\`lang="pt-BR"\`)

## Robustez
- [ ] Hierarquia de headings correta
- [ ] Landmarks (\`header\`, \`main\`, \`nav\`, \`footer\`)
- [ ] Componentes customizados com papel, nome e estado acessíveis
`,
      },
    ],
  },
  {
    id: "brief-do-projeto",
    name: "Brief do projeto",
    category: "Fundação",
    description:
      "Consolida o que se sabe sobre o SaaS em um Brief do Projeto curto e aprovado: cliente, problema, proposta de valor, MVP, stack, prazo e riscos. Use ao final de uma entrevista de descoberta, ao analisar um projeto existente pela primeira vez ou quando o usuário pedir um resumo do projeto.",
    summary: "Consolida descoberta ou análise de código em um brief aprovado.",
    example: "Monte o Brief do Projeto com o que conversamos.",
    tags: ["briefing", "descoberta", "fundação"],
    appliesTo: "ambos",
    stages: ["ideia", "mvp", "primeiros-clientes", "crescimento"],
    effort: "fácil",
    body: `# Brief do projeto

## Passos
1. Reúna as fontes: BRIEFING.md, CLAUDE.md, respostas da entrevista e, em projeto existente, a análise do código (stack, rotas, dados).
2. Preencha o modelo abaixo em no máximo uma página.
3. Marque cada informação como **confirmada** ou **a confirmar**.
4. Liste as decisões em aberto e os riscos.
5. Apresente ao usuário e peça aprovação explícita ("Posso considerar este brief aprovado?").
6. Após aprovação, atualize o BRIEFING.md e a seção de contexto do CLAUDE.md.

## Modelo
\`\`\`
# Brief do Projeto: <nome>
Cliente ideal:
Dor principal:
Como resolve hoje:
Proposta de valor:
Modelo de receita e preço previsto:
MVP (dentro):
MVP (fora):
Integrações:
Stack e hospedagem:
Privacidade/LGPD:
Prazo e orçamento:
Concorrentes e referências:
Identidade visual:
Riscos:
Decisões em aberto:
\`\`\`

## Regras
- Não avance para construção sem aprovação explícita do brief.
- Não invente informação: o que não se sabe fica como "a confirmar".`,
  },
];
