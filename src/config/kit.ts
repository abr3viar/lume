/**
 * Tamanho dos kits. Kits enxutos funcionam melhor: cada agente, skill e MCP ocupa
 * contexto do Claude e dificulta a escolha do especialista certo.
 *
 * - `range`: quantas sugestões pedir/mostrar por tipo [mínimo, máximo].
 * - `more`: quantas a mais em "Gerar mais sugestões".
 * - `essential`: no máximo quantas podem ser marcadas como essenciais.
 * - `cartWarn`: acima disso o carrinho mostra um aviso (não bloqueia).
 */
export const KIT_LIMITS = {
  full: {
    range: { agent: [5, 8], skill: [3, 5], mcp: [3, 5] },
    more: { agent: [2, 4], skill: [2, 3], mcp: [1, 2] },
    essential: { agent: 4, skill: 3, mcp: 2 },
    local: { agent: 7, skill: 5, mcp: 4 },
    localMore: { agent: 3, skill: 2, mcp: 2 },
  },
  task: {
    range: { agent: [3, 5], skill: [3, 5], mcp: [2, 3] },
    more: { agent: [2, 3], skill: [2, 3], mcp: [1, 2] },
    essential: { agent: 3, skill: 2, mcp: 2 },
    local: { agent: 4, skill: 4, mcp: 3 },
    localMore: { agent: 2, skill: 2, mcp: 2 },
  },
  cartWarn: { agent: 8, skill: 5, mcp: 5 },
} as const;

export type KitSize = keyof Pick<typeof KIT_LIMITS, "full" | "task">;
