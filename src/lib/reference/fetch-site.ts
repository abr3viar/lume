import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Busca a página pública de um site de referência com proteção contra SSRF:
 * - só http(s), portas padrão, sem usuário/senha na URL;
 * - o host precisa resolver só para IPs públicos (bloqueia localhost, rede interna, link-local e metadados de nuvem);
 * - redirecionamentos seguidos à mão (no máximo 3), revalidando cada destino;
 * - tempo e tamanho limitados; só HTML e CSS.
 * Limite conhecido: entre a checagem de DNS e a conexão existe uma janela (DNS rebinding). O risco é baixo
 * porque a resposta só vira texto no zip do próprio usuário, e nada é executado.
 */

export class ReferenceError extends Error {}

const TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_CSS_BYTES = 400_000;
const MAX_REDIRECTS = 3;
const UA = "Mozilla/5.0 (compatible; LumeReferenceBot/1.0; +https://lume-kit.vercel.app)";

export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const x = ip.toLowerCase();
  if (x === "::" || x === "::1") return true;
  if (x.startsWith("::ffff:")) return isPrivateIp(x.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(x);
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new ReferenceError("Endereço inválido.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new ReferenceError("Use um endereço que comece com https://.");
  if (u.username || u.password) throw new ReferenceError("Endereço com usuário e senha não é aceito.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new ReferenceError("Só portas padrão (80 e 443).");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new ReferenceError("Esse endereço não é público.");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new ReferenceError("Não encontramos esse site.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new ReferenceError("Esse endereço não é público.");
  return u;
}

async function readLimited(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

async function safeGet(raw: string, accept: string, max: number, signal: AbortSignal) {
  let url = await assertPublicUrl(raw);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(url, { redirect: "manual", signal, headers: { "User-Agent": UA, Accept: accept } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new ReferenceError("O site redirecionou sem destino.");
      url = await assertPublicUrl(new URL(loc, url).toString());
      continue;
    }
    if (!res.ok) throw new ReferenceError(`O site respondeu ${res.status}.`);
    return { url, type: res.headers.get("content-type") ?? "", body: await readLimited(res, max) };
  }
  throw new ReferenceError("Redirecionamentos demais.");
}

/** HTML da página + até 3 folhas de estilo do mesmo site (é nelas que ficam fontes, cores e tokens). */
export async function fetchSite(raw: string): Promise<{ url: string; html: string; css: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const page = await safeGet(raw, "text/html,application/xhtml+xml", MAX_HTML_BYTES, ctrl.signal);
    if (!/html/i.test(page.type)) throw new ReferenceError("Esse endereço não é uma página HTML.");
    const hrefs = [...page.body.matchAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi)]
      .map((m) => /href=["']([^"']+)["']/i.exec(m[0])?.[1])
      .filter((h): h is string => Boolean(h))
      .map((h) => new URL(h, page.url))
      .filter((h) => h.hostname === page.url.hostname)
      .slice(0, 3);
    let css = "";
    for (const h of hrefs) {
      try {
        const r = await safeGet(h.toString(), "text/css", MAX_CSS_BYTES, ctrl.signal);
        if (/css/i.test(r.type)) css += `\n${r.body}`;
      } catch {
        // Uma folha de estilo que falha não derruba a referência.
      }
    }
    return { url: page.url.toString(), html: page.body, css };
  } catch (err) {
    if (err instanceof ReferenceError) throw err;
    if (ctrl.signal.aborted) throw new ReferenceError("O site demorou demais para responder.");
    throw new ReferenceError("Não conseguimos abrir esse site.");
  } finally {
    clearTimeout(timer);
  }
}
