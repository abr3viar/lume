import type { SaasInfo } from "@/lib/schemas";

/**
 * Perfis de stack reconhecidos a partir da stack informada (chips ou texto livre).
 * Só trazem convenções amplamente aceitas para cada ecossistema. Os comandos exatos
 * (test, lint, build) NÃO são inventados aqui: o Claude descobre no projeto e anota no CLAUDE.md.
 */
export type StackProfile = {
  id: string;
  label: string;
  match: RegExp;
  conventions: string[];
  /** Onde o Claude deve procurar os comandos do projeto. */
  commandSources: string[];
};

export const STACK_PROFILES: StackProfile[] = [
  {
    id: "node-ts",
    label: "JavaScript/TypeScript (Node, React, Next.js, Vue, Svelte)",
    match: /\bnext(\.?js)?\b|\breact\b|\bnode(\.?js)?\b|\bvue\b|svelte|angular|\bnuxt\b|\bremix\b|\bastro\b|\bexpress\b|\bnest(js)?\b|typescript|javascript|\bvite\b/,
    conventions: [
      "TypeScript com tipos explícitos nas fronteiras (props, rotas, funções exportadas); evite `any` e `as` sem motivo.",
      "Nomes de arquivos e pastas seguem o padrão que já existe no projeto (ex.: `kebab-case`); componentes React em PascalCase.",
      "Valide entradas externas (formulários, APIs, variáveis de ambiente) no servidor antes de usar.",
      "Trate erros com mensagens claras para quem usa e sem vazar detalhes internos; não engula exceções em `catch` vazio.",
      "Segredos só em variáveis de ambiente no servidor; nada com prefixo público (`NEXT_PUBLIC_`, `VITE_`) que seja secreto.",
    ],
    commandSources: ["`package.json` (seção `scripts`)", "arquivos de config do linter, formatador e testes"],
  },
  {
    id: "python",
    label: "Python (Django, Flask, FastAPI)",
    match: /python|django|\bflask\b|fastapi/,
    conventions: [
      "Siga a PEP 8 e use type hints nas funções públicas.",
      "Organize por app ou módulo de domínio; não misture regra de negócio com views ou rotas.",
      "Valide entradas com o mecanismo do framework (forms, serializers, Pydantic).",
      "Levante exceções específicas e trate-as na borda (view/rota) com respostas claras.",
      "Migrações versionadas; nunca edite uma migração já aplicada em produção.",
    ],
    commandSources: ["`pyproject.toml`", "`requirements*.txt`", "`Makefile`", "`manage.py` / config do pytest"],
  },
  {
    id: "php-laravel",
    label: "PHP (Laravel)",
    match: /laravel|\bphp\b/,
    conventions: [
      "Siga a PSR-12 e as convenções do Laravel (Controllers finos, regras em Services/Actions).",
      "Valide com Form Requests; nunca confie em dados do request sem validação.",
      "Use Eloquent com relacionamentos e evite consultas N+1 (`with`).",
      "Migrações versionadas; não altere migrações já aplicadas.",
    ],
    commandSources: ["`composer.json` (scripts)", "`phpunit.xml`", "`artisan`"],
  },
  {
    id: "ruby-rails",
    label: "Ruby (Rails)",
    match: /\brails\b|\bruby\b/,
    conventions: [
      "Siga as convenções do Rails (models gordos com responsabilidade clara, controllers finos).",
      "Strong parameters em todo controller que recebe dados.",
      "Migrações versionadas; não altere migrações já aplicadas.",
    ],
    commandSources: ["`Gemfile`", "`bin/` (rails, rspec)", "`.rubocop.yml`"],
  },
  {
    id: "dart-flutter",
    label: "Dart (Flutter)",
    match: /flutter|\bdart\b/,
    conventions: [
      "Siga o `analysis_options.yaml` do projeto e as regras do `flutter_lints`.",
      "Separe UI, estado e acesso a dados; widgets pequenos e reutilizáveis.",
    ],
    commandSources: ["`pubspec.yaml`", "`analysis_options.yaml`"],
  },
  {
    id: "no-code",
    label: "No-code / CMS (Bubble, WordPress)",
    match: /\bbubble\b|wordpress|webflow|\bwix\b/,
    conventions: [
      "Documente cada mudança feita fora do código (telas, workflows, plugins) no CLAUDE.md.",
      "Teste em uma cópia ou ambiente de desenvolvimento antes de publicar.",
    ],
    commandSources: ["painel da plataforma", "arquivos de tema ou plugin, se houver"],
  },
];

export function detectStacks(saas: Pick<SaasInfo, "stack" | "description" | "details">): StackProfile[] {
  const text = `${saas.stack.join(" ")} ${saas.description} ${saas.details ?? ""}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return STACK_PROFILES.filter((p) => p.match.test(text));
}
