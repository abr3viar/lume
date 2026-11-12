import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agents, skills } from "@/data/catalog";
import { AdaptiveLimit, dynamicPool, HttpError, KitGeneration, withRetry } from "@/lib/client/generate";
import { saasInfoSchema } from "@/lib/schemas";

const saas = saasInfoSchema.parse({ name: "Agenda Clinica", description: "Agenda online para clínicas.", model: "B2B" });
const ids = { agents: ["suporte-cliente", "revisor-codigo", "gerador-testes"], skills: ["escrever-prd"], mcps: [] };

type Handler = (body: { kind: string; id?: string }) => { status: number; result?: unknown };

function stubFetch(handler: Handler, latency = 5) {
  const calls: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  vi.stubGlobal("fetch", async (_u: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    calls.push(body.id ?? body.kind);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, latency));
    inFlight--;
    const { status, result } = handler(body);
    return new Response(JSON.stringify(status === 200 ? { result } : { error: "x" }), { status });
  });
  return { calls, max: () => maxInFlight };
}

const ok: Handler = (b) => {
  if (b.kind === "agent") {
    const a = agents.find((x) => x.id === b.id)!;
    return { status: 200, result: { description: `Use quando precisar de ${a.name} na clínica.`, prompt: a.systemPrompt } };
  }
  if (b.kind === "skill") {
    const s = skills.find((x) => x.id === b.id)!;
    return { status: 200, result: { description: s.description, body: s.body } };
  }
  return { status: 200, result: { summary: "Resumo do SaaS de teste com tamanho suficiente.", focus: ["Foco principal"], usage: [] } };
};

afterEach(() => vi.unstubAllGlobals());

describe("concorrência adaptativa", () => {
  it("sobe com sucessos seguidos e cai pela metade no 429", () => {
    const l = new AdaptiveLimit(3, 1, 6, 3);
    for (let i = 0; i < 9; i++) l.onSuccess();
    expect(l.current).toBe(6);
    l.onSuccess();
    expect(l.current).toBe(6); // teto
    l.onRateLimit();
    expect(l.current).toBe(3);
    l.onRateLimit();
    l.onRateLimit();
    expect(l.current).toBe(1); // piso
  });

  it("o pool respeita o limite atual", async () => {
    let running = 0;
    let peak = 0;
    await dynamicPool([1, 2, 3, 4, 5, 6, 7, 8], { current: 2 }, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
    });
    expect(peak).toBe(2);
  });

  it("withRetry repete 429 e 5xx, mas não 422 nem 503", async () => {
    const ctrl = new AbortController();
    let n = 0;
    await expect(withRetry(async () => { n++; throw new HttpError(422); }, ctrl.signal, 3, 1)).rejects.toThrow();
    expect(n).toBe(1);
    n = 0;
    await expect(withRetry(async () => { n++; throw new HttpError(503); }, ctrl.signal, 3, 1)).rejects.toThrow();
    expect(n).toBe(1);
    n = 0;
    const v = await withRetry(async () => { n++; if (n < 3) throw new HttpError(429); return "ok"; }, ctrl.signal, 3, 1);
    expect(v).toBe("ok");
    expect(n).toBe(3);
  });
});

describe("KitGeneration", () => {
  it("com 429 constante, a concorrência cai e os itens vão para o modelo base", async () => {
    stubFetch(() => ({ status: 429 }));
    const gen = new KitGeneration({ mode: "existente", saas, ids, ai: true }, () => {});
    // withRetry usa backoff real; aqui encurtamos com timers falsos.
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
    await gen.run(new AbortController().signal);
    vi.useRealTimers();
    expect(gen.limit.current).toBe(1);
    const r = await gen.pack();
    expect(r.fallbacks).toHaveLength(4);
    expect(r.fallbackKeys).toContain("context");
  }, 60000);

  it("tentar de novo só os itens que falharam", async () => {
    let failRevisor = true;
    const s = stubFetch((b) => (b.id === "revisor-codigo" && failRevisor ? { status: 422 } : ok(b)));
    const gen = new KitGeneration({ mode: "existente", saas, ids, ai: true }, () => {});
    await gen.run(new AbortController().signal);
    let r = await gen.pack();
    expect(r.fallbacks).toEqual(["Revisor de código"]);
    expect(r.fallbackKeys).toEqual(["agent:revisor-codigo"]);
    expect(r.partial).toBe(false);

    s.calls.length = 0;
    failRevisor = false;
    await gen.retryFailed(new AbortController().signal);
    expect(s.calls).toEqual(["revisor-codigo"]); // nada mais foi refeito
    r = await gen.pack();
    expect(r.fallbacks).toEqual([]);
  });

  it("download parcial: empacota no meio da geração, com o resto no modelo base", async () => {
    stubFetch(ok, 40);
    const gen = new KitGeneration({ mode: "existente", saas, ids, ai: true }, () => {});
    const running = gen.run(new AbortController().signal);
    await new Promise((r) => setTimeout(r, 60)); // alguns itens prontos, outros não
    const partial = await gen.pack();
    expect(partial.partial).toBe(true);
    const zip = await JSZip.loadAsync(await partial.zip.arrayBuffer());
    expect(Object.keys(zip.files).some((f) => f.endsWith("CLAUDE.md"))).toBe(true);
    await running;
    const full = await gen.pack();
    expect(full.partial).toBe(false);
    expect(full.fallbacks).toEqual([]);
  });

  it("modo sem IA não chama a API", async () => {
    const s = stubFetch(ok);
    const gen = new KitGeneration({ mode: "existente", saas, ids, ai: false }, () => {});
    await gen.run(new AbortController().signal);
    const r = await gen.pack();
    expect(s.calls).toEqual([]);
    expect(r.fallbacks).toEqual([]);
    expect(r.partial).toBe(false);
  });
});
