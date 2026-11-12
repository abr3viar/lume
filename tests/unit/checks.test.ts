import { describe, expect, it } from "vitest";
import { presets } from "@/data/catalog";
import { checkCart } from "@/lib/kit/checks";
import { adaptPreset } from "@/lib/presets-adapt";

describe("checkCart", () => {
  it("avisa carrinho vazio", () => {
    expect(checkCart({ agents: [], skills: [], mcps: [] }, "B2B")[0].id).toBe("vazio");
  });

  it("conta variáveis de ambiente e lista MCPs com OAuth", () => {
    const out = checkCart({ agents: ["suporte-cliente"], skills: [], mcps: ["github", "context7", "sentry"] }, "B2B");
    const cred = out.find((c) => c.id === "credenciais")!;
    expect(cred.title).toBe("2 variáveis de ambiente para preencher");
    expect(out.find((c) => c.id === "oauth")!.detail).toContain("Sentry");
  });

  it("alerta excesso de MCPs e acesso amplo", () => {
    const out = checkCart(
      { agents: ["suporte-cliente"], skills: [], mcps: ["github", "context7", "sentry", "supabase", "vercel", "playwright"] },
      "B2B",
    );
    expect(out.some((c) => c.id === "muitos-mcps")).toBe(true);
    expect(out.some((c) => c.id === "acesso-amplo")).toBe(true);
  });

  it("detecta redundâncias uma vez por par", () => {
    const out = checkCart({ agents: ["suporte-cliente", "base-conhecimento"], skills: [], mcps: [] }, "B2C");
    expect(out.filter((c) => c.id.startsWith("redundancia")).length).toBe(1);
  });

  it("aponta itens de outro modelo de negócio", () => {
    const out = checkCart({ agents: ["sdr-prospeccao", "comunidade"], skills: [], mcps: [] }, "B2C");
    const pub = out.find((c) => c.id === "publico")!;
    expect(pub.detail).toContain("SDR");
    expect(pub.detail).not.toContain("Comunidade");
  });

  it("B2B2C aceita itens dos dois públicos", () => {
    const out = checkCart({ agents: ["sdr-prospeccao", "comunidade"], skills: [], mcps: [] }, "B2B2C");
    expect(out.some((c) => c.id === "publico")).toBe(false);
  });
});

describe("adaptPreset", () => {
  const b2b = presets.find((p) => p.id === "crescimento-b2b")!;
  it("remove itens de outro modelo de negócio", () => {
    const a = adaptPreset(b2b, { model: "B2C", mode: "existente" });
    expect(a.agent).not.toContain("sdr-prospeccao");
    expect(a.dropped).toContain("SDR e prospecção");
  });
  it("no modo do zero garante itens de fundação", () => {
    const a = adaptPreset(b2b, { model: "B2B", mode: "zero" });
    expect(a.skill[0]).toBe("brief-do-projeto");
    expect(a.agent).toContain("arquiteto-produto");
  });
  it("conta quantos itens a IA também sugeriu", () => {
    const a = adaptPreset(b2b, { model: "B2B", mode: "existente", recommended: { agent: ["sdr-prospeccao"], skill: [], mcp: ["posthog"] } });
    expect(a.alsoSuggested).toBe(2);
  });
});
