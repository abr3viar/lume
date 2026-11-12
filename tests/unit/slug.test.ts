import { describe, expect, it } from "vitest";
import { isSafeZipPath, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("remove acentos, espaços e símbolos", () => {
    expect(slugify("Agenda Clínica São João!")).toBe("agenda-clinica-sao-joao");
  });
  it("neutraliza tentativas de path traversal", () => {
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
    expect(slugify("..\\..\\windows")).toBe("windows");
    expect(slugify("C:\\Users")).toBe("c-users");
  });
  it("usa o padrão quando sobra pouco", () => {
    expect(slugify("!!!")).toBe("meu-saas");
    expect(slugify("🔥")).toBe("meu-saas");
  });
  it("limita o tamanho sem terminar em hífen", () => {
    const s = slugify("a".repeat(47) + " bcd");
    expect(s.length).toBeLessThanOrEqual(48);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("isSafeZipPath", () => {
  it("aceita caminhos relativos simples", () => {
    expect(isSafeZipPath(".claude/agents/suporte.md")).toBe(true);
    expect(isSafeZipPath(".mcp.json")).toBe(true);
  });
  it("recusa traversal, absolutos e barras invertidas", () => {
    for (const p of ["../x.md", "a/../b.md", "/etc/passwd", "C:/x", "a\\b.md", "a//b.md", "./a.md", ""]) {
      expect(isSafeZipPath(p), p).toBe(false);
    }
  });
});
