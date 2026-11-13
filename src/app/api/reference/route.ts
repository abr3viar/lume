import { z } from "zod";
import { jsonError, readJson } from "@/lib/http";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { extractReference } from "@/lib/reference/extract";
import { fetchSite, ReferenceError } from "@/lib/reference/fetch-site";

export const maxDuration = 20;

const bodySchema = z.object({ url: z.string().trim().min(8).max(500) });

/** Busca um site de referência visual e devolve o material extraído (fontes, cores, estrutura, HTML limpo). */
export async function POST(req: Request) {
  const rl = await rateLimit("reference", clientIp(req.headers), LIMITS.reference.limit, LIMITS.reference.windowSec);
  if (!rl.ok) return jsonError(429, "Muitos sites seguidos. Espere alguns minutos.", { "Retry-After": String(rl.resetSeconds) });
  const body = await readJson(req, bodySchema, 4_000);
  if (!body.ok) return body.response;
  try {
    const site = await fetchSite(body.data.url);
    return Response.json({ reference: extractReference(site.url, site.html, site.css) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof ReferenceError ? err.message : "Não conseguimos abrir esse site.";
    console.error("[reference] falha", err instanceof Error ? err.name : "erro");
    return jsonError(422, message);
  }
}
