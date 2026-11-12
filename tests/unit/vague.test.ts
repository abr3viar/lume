import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import { saasInfoSchemaFor } from "@/lib/schemas";
import { isVague, vagueness } from "@/lib/vague";

describe("descrição vaga", () => {
  it("marca como vaga o que não diz o que faz nem para quem", () => {
    for (const t of [
      "Um app de gestão",
      "Sistema para empresas",
      "Uma plataforma online simples para ajudar pessoas",
      "não funciona",
      "deu erro na página",
      "",
    ]) {
      expect(isVague(t), t).toBe(true);
    }
  });

  it("aceita descrições específicas, inclusive todos os exemplos clicáveis", () => {
    const ok = [
      "Agenda online para clínicas pequenas, com lembretes por WhatsApp.",
      "App de treinos curtos em casa com progresso semanal.",
      "Ao salvar um agendamento a página dá erro 500 e nada é salvo.",
      ...brand.examples.saas.map((e) => e.text),
      ...brand.examples.erro.map((e) => e.text),
      ...brand.examples.ajuste.map((e) => e.text),
    ];
    for (const t of ok) expect(isVague(t), t).toBe(false);
  });

  it("explica a contagem", () => {
    expect(vagueness("Sistema de gestão para empresas")).toEqual({ vague: true, words: 5, contentWords: 0 });
  });
});

describe("menos atrito no início", () => {
  it("projeto existente e do zero exigem só nome, descrição e modelo", () => {
    const minimal = { name: "Agenda", description: "Agenda online para clínicas.", model: "B2B" };
    expect(saasInfoSchemaFor("existente").safeParse(minimal).success).toBe(true);
    expect(saasInfoSchemaFor("zero").safeParse(minimal).success).toBe(true);
    const res = saasInfoSchemaFor("existente").safeParse({ name: "Agenda" });
    expect(res.error!.issues.map((i) => i.path[0]).sort()).toEqual(["description", "model"]);
  });
});
