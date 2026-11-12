import "server-only";
import { z } from "zod";

export function jsonError(status: number, message: string, extra: Record<string, string> = {}) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...extra } });
}

/** Lê e valida o corpo JSON com limite de tamanho. */
export async function readJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  maxBytes = 64_000,
): Promise<{ ok: true; data: z.output<T> } | { ok: false; response: Response }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return { ok: false, response: jsonError(413, "Os dados enviados são grandes demais.") };
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return { ok: false, response: jsonError(413, "Os dados enviados são grandes demais.") };
    raw = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, "Não conseguimos ler os dados enviados.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, response: jsonError(400, first?.message ?? "Dados inválidos.") };
  }
  return { ok: true, data: parsed.data };
}
