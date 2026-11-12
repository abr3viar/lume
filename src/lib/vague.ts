/**
 * Critério simples e testável para "descrição vaga": o texto não diz o que o produto
 * faz nem para quem. Usado para pedir mais detalhes antes de gerar um kit genérico.
 *
 * É vaga quando:
 * - tem menos de 6 palavras; ou
 * - tem menos de 3 palavras de conteúdo (4+ letras e fora da lista de termos genéricos).
 */
const GENERIC = new Set([
  "aplicativo", "aplicacao", "app", "sistema", "saas", "plataforma", "software", "produto", "ferramenta", "site",
  "solucao", "solucoes", "online", "digital", "web", "empresa", "empresas", "negocio", "negocios", "pessoas",
  "usuarios", "clientes", "coisas", "tudo", "todos", "muito", "melhor", "simples", "facil", "gestao", "gerenciar",
  "gerenciamento", "ajudar", "ajuda", "fazer", "para", "como", "isso", "esse", "essa", "este", "esta", "meu",
  "minha", "nosso", "nossa", "qualquer", "geral", "varios", "varias", "outro", "outra", "quando", "onde", "mais",
  "menos", "pode", "podem", "seja", "funciona", "funcionar", "funcionando", "certo", "errado", "problema",
  "problemas", "erro", "erros", "coisa", "parte", "pagina", "tela",
]);

function words(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function vagueness(text: string): { vague: boolean; words: number; contentWords: number } {
  const w = words(text);
  const content = w.filter((x) => x.length >= 4 && !GENERIC.has(x));
  return { vague: w.length < 6 || new Set(content).size < 3, words: w.length, contentWords: new Set(content).size };
}

export function isVague(text: string) {
  return vagueness(text).vague;
}
