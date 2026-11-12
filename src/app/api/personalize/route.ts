import { friendlyError, hasApiKey } from "@/lib/ai/client";
import { personalize, PersonalizationRejected } from "@/lib/ai/personalize";
import { jsonError, readJson } from "@/lib/http";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { personalizeRequestSchema } from "@/lib/schemas";

/** Cada chamada personaliza um único item: curta, para não estourar o tempo da função. */
export const maxDuration = 60;

// Futuro: pagamento e cota por conta entrariam aqui, antes de chamar a IA.

export async function POST(req: Request) {
  const rl = await rateLimit("personalize", clientIp(req.headers), LIMITS.personalize.limit, LIMITS.personalize.windowSec);
  if (!rl.ok) {
    return jsonError(429, "Muitas personalizações seguidas. Espere alguns minutos.", { "Retry-After": String(rl.resetSeconds) });
  }
  const body = await readJson(req, personalizeRequestSchema);
  if (!body.ok) return body.response;
  if (!hasApiKey()) return jsonError(503, "A IA ainda não está configurada neste ambiente.");

  try {
    const result = await personalize(body.data, req.signal);
    return Response.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof PersonalizationRejected) {
      return jsonError(422, "A adaptação não passou na verificação de qualidade. Usaremos o modelo base.");
    }
    const { status, message } = friendlyError(err);
    console.error("[personalize] falha", status, err instanceof Error ? err.name : "erro");
    return jsonError(status, message);
  }
}
