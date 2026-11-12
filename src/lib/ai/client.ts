import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeCodeError, claudeCodeEnabled } from "./claude-code";

/** Modelos vêm do ambiente; nada fixo no código além dos padrões documentados. */
export function models() {
  return {
    main: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5",
    fast: process.env.ANTHROPIC_MODEL_FAST?.trim() || "claude-haiku-5-5",
  };
}

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Há IA disponível: Claude Code local (no seu PC) ou chave da API. */
export function aiAvailable() {
  return claudeCodeEnabled() || hasApiKey();
}

/** Qual IA vai responder: Claude Code local tem prioridade sobre a API. */
export function aiProvider(): "claude-code" | "api" | "local" {
  if (claudeCodeEnabled()) return "claude-code";
  if (hasApiKey()) return "api";
  return "local";
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!hasApiKey()) throw new MissingKeyError();
  client ??= new Anthropic({ maxRetries: 2, timeout: 90_000 });
  return client;
}

export class MissingKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY não configurada");
  }
}

/**
 * Modelos que aceitam o fallback de recusa no servidor (`fallbacks: "default"`).
 * Para os demais (ex.: Haiku), a chamada segue sem fallback.
 */
export function supportsServerFallback(model: string) {
  return /^claude-(sonnet-5-5|opus-5-5|opus-5|fable-5)/.test(model);
}

/** Sonnet 5.5 aceita `between_tools` para desligar o raciocínio e responder mais rápido. */
export function supportsBetweenTools(model: string) {
  return model.startsWith("claude-sonnet-5-5");
}

/** Converte erros do SDK em status HTTP e mensagens amigáveis (sem vazar detalhes). */
export function friendlyError(err: unknown): { status: number; message: string } {
  if (err instanceof ClaudeCodeError) {
    const status = err.kind === "limite" ? 429 : err.kind === "tempo" ? 504 : 502;
    return { status, message: err.message };
  }
  if (err instanceof MissingKeyError) {
    return { status: 503, message: "A IA ainda não está configurada neste ambiente. Tente de novo mais tarde." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "Muita gente acendendo kits agora. Espere alguns segundos e tente de novo." };
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return { status: 504, message: "A IA demorou demais para responder. Tente de novo." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 502, message: "Não conseguimos falar com a IA agora. Tente de novo em instantes." };
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { status: 503, message: "A IA está indisponível no momento. Tente de novo mais tarde." };
  }
  if (err instanceof Anthropic.BadRequestError) {
    return { status: 502, message: "A IA recusou o pedido. Revise os textos e tente de novo." };
  }
  if (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500) {
    return { status: 502, message: "A IA está instável agora. Tente de novo em instantes." };
  }
  return { status: 500, message: "Faltou luz por aqui. Tente de novo em instantes." };
}
