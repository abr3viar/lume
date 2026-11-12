import { friendlyError, hasApiKey } from "@/lib/ai/client";
import { streamRecommendations } from "@/lib/ai/recommend";
import { jsonError, readJson } from "@/lib/http";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { recommendRequestSchema } from "@/lib/schemas";

export const maxDuration = 120;

// Futuro: autenticação e histórico de kits entrariam aqui (identificar a conta,
// salvar a recomendação e cobrar por uso). Esta versão é stateless e sem login.

export async function POST(req: Request) {
  const rl = await rateLimit("recommend", clientIp(req.headers), LIMITS.recommend.limit, LIMITS.recommend.windowSec);
  if (!rl.ok) {
    return jsonError(429, "Você pediu muitas recomendações seguidas. Espere alguns minutos e tente de novo.", {
      "Retry-After": String(rl.resetSeconds),
    });
  }

  const body = await readJson(req, recommendRequestSchema);
  if (!body.ok) return body.response;
  if (!hasApiKey()) return jsonError(503, "A IA ainda não está configurada neste ambiente. Tente de novo mais tarde.");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      let count = 0;
      try {
        for await (const item of streamRecommendations(body.data, req.signal)) {
          count++;
          send({ type: "item", item });
        }
        send({ type: "done", count });
      } catch (err) {
        const { message, status } = friendlyError(err);
        // Nunca registramos dados do usuário nem a chave: só o tipo do erro.
        console.error("[recommend] falha", status, err instanceof Error ? err.name : "erro");
        send({ type: "error", message, status });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
