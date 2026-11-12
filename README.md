# Lume

**Acenda o seu SaaS.** O Lume monta um kit sob medida de agentes, skills e MCPs para o Claude Code a partir da descrição de um SaaS. A pessoa monta o carrinho e baixa um `.zip` pronto para soltar na pasta do projeto, com tutorial (LEIA-ME) e prompt de ativação. Para quem ainda não tem projeto, o kit liga o **Modo Descoberta**: o Claude entrevista a pessoa antes de escrever qualquer código.

O nome e os textos da marca ficam em [`src/config/brand.ts`](src/config/brand.ts). A cor principal fica em `--brand` em [`src/app/globals.css`](src/app/globals.css).

## Modos de IA

O Lume escolhe o modo automaticamente, nesta ordem:

| Modo | Quando | Custo |
|---|---|---|
| **Claude Code local** | `LUME_AI_PROVIDER=claude-code` e o Lume rodando no seu PC | Usa a sua conta do Claude (o mesmo uso do Claude Code) |
| **API da Anthropic** | `ANTHROPIC_API_KEY` configurada | Cobrado por uso no Console da Anthropic |
| **Sem IA** | nada configurado (é o modo da versão publicada) | Grátis: recomendador local e modelos base |

No modo sem IA, as sugestões vêm de um recomendador determinístico que cruza nicho, modelo de negócio, estágio, objetivo e stack, e o kit sai com os modelos base. A adaptação ao projeto acontece no próprio Claude Code, pelo prompt de ativação. Se a IA falhar sem devolver nada, o Lume cai nesse modo sozinho.

## Rodar no seu PC com o Claude Code (recomendado)

Requisitos: Node.js 20.9 ou superior e o [Claude Code](https://code.claude.com/docs/en/setup) instalado e logado (rode `claude` uma vez no terminal).

```bash
git clone <url-deste-repositorio> lume
cd lume
npm install
cp .env.example .env.local
```

No `.env.local`, descomente `LUME_AI_PROVIDER=claude-code`. Depois:

```bash
npm run build
npm start
```

Abra http://localhost:3000. No Windows, dê dois cliques em `Lume.cmd`: ele instala, prepara e abre o navegador sozinho. Depois de atualizar o código (`git pull`), rode `npm run build` de novo.

**Como funciona:** o servidor do Lume chama `claude -p` em modo headless, com um system prompt próprio, sem ferramentas (`--tools ""`), sem MCPs (`--strict-mcp-config`), sem salvar sessão e numa pasta temporária vazia. O Claude só lê o texto que o Lume manda e devolve texto; não acessa seus arquivos. O código está em [`src/lib/ai/claude-code.ts`](src/lib/ai/claude-code.ts). Esse modo nunca é ativado na Vercel.

## Rodar com a API

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

| Variável | Obrigatória | Padrão | Para quê |
|---|---|---|---|
| `LUME_AI_PROVIDER` | não | | `claude-code` liga o modo local |
| `LUME_CLAUDE_MODEL` / `LUME_CLAUDE_MODEL_FAST` | não | `sonnet` / `haiku` | Modelos no modo Claude Code |
| `ANTHROPIC_API_KEY` | não | | Chave da API, usada só no servidor |
| `ANTHROPIC_MODEL` | não | `claude-sonnet-5-5` | Recomendações |
| `ANTHROPIC_MODEL_FAST` | não | `claude-haiku-5-5` | Personalização em massa |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | não | | Rate limit compartilhado (sem elas: em memória, best-effort) |
| `NEXT_PUBLIC_SITE_URL` | não | | URL pública para metadados e Open Graph |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Valida o catálogo e gera o build de produção |
| `npm run lint` / `npm run typecheck` | ESLint e TypeScript estrito |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | E2E com Playwright nos dois modos, com a IA mockada (rode `npm run build` antes) |
| `npm run verify:catalog` | Valida todos os templates: esquema, ids únicos, frontmatter, MCPs com `docsUrl` e `verifiedAt` |

## Arquitetura

```
src/
├── config/brand.ts            nome, tagline e microcopy
├── data/catalog/              catálogos tipados e validados por zod no carregamento
│   ├── agents-*.ts            37 agentes com prompt estruturado (papel, objetivo, passos, saída, regras, conclusão)
│   ├── skills.ts              21 Agent Skills (SKILL.md + arquivos auxiliares)
│   ├── mcps.ts                16 MCPs verificados, com fonte e data
│   └── presets.ts             kits prontos
├── lib/
│   ├── ai/                    só servidor: prompts, streaming de recomendações, personalização
│   ├── kit/                   geração dos arquivos, zip, verificações do carrinho (puro, roda no navegador e nos testes)
│   ├── client/                orquestração no navegador (SSE, fila de personalização, fallback)
│   └── rate-limit.ts          Upstash REST ou memória
├── app/api/recommend          POST, streaming SSE (NDJSON da IA validado linha a linha)
├── app/api/personalize        POST, um item por chamada (curta, sem risco de timeout)
└── components/                landing, assistente em 5 etapas, carrinho, paleta de comandos
```

**Como a IA trabalha.** A IA não inventa itens: escolhe ids dentro do catálogo e escreve a justificativa. As recomendações chegam em NDJSON; cada linha é validada com zod e descartada se o id não existir, repetir ou estiver excluído. Se algum tipo ficar abaixo do mínimo, há uma nova tentativa com saída estruturada. Os dados do SaaS vão dentro de `<saas_info>`, com instrução para tratá-los só como dados.

**Geração sem timeout.** O navegador orquestra: uma chamada a `/api/personalize` por agente e skill, com concorrência 3, retry com backoff e fallback para o template base (registrado no LEIA-ME). O contexto do `CLAUDE.md` e do LEIA-ME tem chamada própria. O zip é montado no navegador com JSZip.

**Segurança.** Nenhum dado sai do seu navegador além do que você digita no assistente, enviado às rotas do próprio Lume. A chave da Anthropic, quando usada, só existe no servidor (`server-only`). O kit nunca leva segredos: credenciais como `${VAR}` no `.mcp.json`, `.env.example` vazio e varredura de padrões de chaves antes do zip. Headers de segurança e CSP em `next.config.ts`. Caminhos do zip validados contra path traversal.

## Próximos passos (pontos marcados no código)

Login, histórico de kits e pagamento entrariam nas rotas de API (comentários em `src/app/api/*/route.ts`). O catálogo de MCPs pode ganhar uma verificação automática periódica das URLs de documentação.

## Licença

[MIT](LICENSE).

---

Agentes, skills e MCPs são pontos de partida; revise tudo antes de usar em produção.
