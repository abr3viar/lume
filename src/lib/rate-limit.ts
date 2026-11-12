import "server-only";

/**
 * Limitador de requisições por IP.
 *
 * - Com UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN configurados, usa um contador
 *   compartilhado no Upstash Redis (janela fixa).
 * - Sem eles, usa um contador em memória. Em serverless isso é best-effort: cada instância
 *   tem a própria memória, então o limite real pode ser maior que o configurado.
 */
type Result = { ok: boolean; remaining: number; resetSeconds: number };

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowSec: number): Result {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > 5000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return { ok: true, remaining: limit - 1, resetSeconds: windowSec };
  }
  entry.count++;
  return {
    ok: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

async function upstashLimit(key: string, limit: number, windowSec: number): Promise<Result | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec), "NX"],
        ["TTL", key],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: number }[];
    const count = Number(data[0]?.result ?? 0);
    const ttl = Number(data[2]?.result ?? windowSec);
    return { ok: count <= limit, remaining: Math.max(0, limit - count), resetSeconds: ttl > 0 ? ttl : windowSec };
  } catch {
    return null; // se o Upstash falhar, cai no limitador em memória
  }
}

export async function rateLimit(bucket: string, ip: string, limit: number, windowSec: number): Promise<Result> {
  const key = `lume:rl:${bucket}:${ip}`;
  return (await upstashLimit(key, limit, windowSec)) ?? memoryLimit(key, limit, windowSec);
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return headers.get("x-real-ip")?.slice(0, 64) ?? "local";
}

export const LIMITS = {
  recommend: { limit: 12, windowSec: 600 },
  personalize: { limit: 150, windowSec: 600 },
} as const;
