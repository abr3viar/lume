/**
 * Converte um texto em slug seguro para nome de pasta/arquivo.
 * Remove acentos, barras, pontos e qualquer coisa que permita path traversal.
 */
export function slugify(input: string, fallback = "meu-saas"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug.length >= 2 ? slug : fallback;
}

/** Garante que um caminho relativo do zip é seguro (sem `..`, absolutos ou caracteres estranhos). */
export function isSafeZipPath(path: string): boolean {
  if (!path || path.length > 200) return false;
  if (path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:/.test(path)) return false;
  if (path.includes("\\")) return false;
  const parts = path.split("/");
  return parts.every((p) => p.length > 0 && p !== "." && p !== ".." && /^[A-Za-z0-9._-]+$/.test(p));
}
