import { describe, expect, it } from "vitest";
import { agentById } from "@/data/catalog";
import { recommendationSchema, recommendRequestSchema } from "@/lib/schemas";
import { localRecommendations } from "@/lib/recommend-local";
import { saasExisting, saasZero } from "./fixtures";

const req = (over: Record<string, unknown>) => recommendRequestSchema.parse({ mode: "existente", saas: saasExisting, ...over });

describe("recomendador local", () => {
  it("devolve itens válidos do catálogo nas quantidades esperadas", () => {
    const out = localRecommendations(req({}));
    expect(out.filter((i) => i.kind === "agent")).toHaveLength(10);
    expect(out.filter((i) => i.kind === "skill")).toHaveLength(8);
    expect(out.filter((i) => i.kind === "mcp")).toHaveLength(5);
    for (const item of out) expect(recommendationSchema.safeParse(item).success, item.id).toBe(true);
    expect(new Set(out.map((i) => `${i.kind}:${i.id}`)).size).toBe(out.length);
  });

  it("é determinístico", () => {
    expect(localRecommendations(req({}))).toEqual(localRecommendations(req({})));
  });

  it("usa o nicho e a stack: saúde puxa LGPD e Supabase entra nos MCPs", () => {
    const out = localRecommendations(req({}));
    const ids = out.map((i) => i.id);
    expect(ids).toContain("checklist-lgpd");
    expect(ids).toContain("termos-privacidade-lgpd");
    expect(ids).toContain("supabase");
    const lgpd = out.find((i) => i.id === "termos-privacidade-lgpd")!;
    expect(lgpd.reason).toContain("Agenda Clínica");
    expect(lgpd.reason).toContain("LGPD");
  });

  it("não sugere itens de outro modelo de negócio", () => {
    const out = localRecommendations(req({ saas: { ...saasExisting, model: "B2C" } }));
    for (const i of out.filter((x) => x.kind === "agent")) expect(agentById.get(i.id)!.appliesTo).not.toBe("B2B");
  });

  it("no modo do zero prioriza a fundação", () => {
    const out = localRecommendations(recommendRequestSchema.parse({ mode: "zero", saas: saasZero }));
    const agents = out.filter((i) => i.kind === "agent").map((i) => i.id);
    for (const id of ["arquiteto-produto", "definicao-mvp", "modelagem-dados"]) expect(agents.slice(0, 6)).toContain(id);
    expect(out.find((i) => i.kind === "skill")!.id).toBe("brief-do-projeto");
  });

  it("evita MCPs que duplicam ferramentas nativas", () => {
    const ids = localRecommendations(req({})).filter((i) => i.kind === "mcp").map((i) => i.id);
    for (const id of ["filesystem", "fetch", "git", "memory"]) expect(ids).not.toContain(id);
  });

  it("'gerar mais' respeita exclusões e não repete", () => {
    const first = localRecommendations(req({}));
    const excl = { agent: first.filter((i) => i.kind === "agent").map((i) => i.id), skill: [], mcp: [] };
    const more = localRecommendations(req({ kinds: ["agent"], more: true, excludeIds: excl }));
    expect(more).toHaveLength(5);
    for (const i of more) expect(excl.agent).not.toContain(i.id);
  });
});
