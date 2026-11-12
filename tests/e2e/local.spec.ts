import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

/**
 * Modo sem chave de API, sem nenhum mock: usa as rotas reais.
 * Roda contra o build local e contra a produção (E2E_BASE_URL).
 */
for (const mode of ["existente", "zero"] as const) {
  test(`sem chave, modo ${mode}: recomendador local e zip completo`, async ({ page }) => {
    const personalizeCalls: string[] = [];
    page.on("request", (r) => r.url().includes("/api/personalize") && personalizeCalls.push(r.url()));

    await page.goto("/montar");
    await page.getByRole("radio", { name: mode === "zero" ? /Vou começar do zero/ : /Já tenho um projeto/ }).click();
    const name = mode === "zero" ? "Treino em Casa" : "Agenda Clínica";
    await page.getByLabel("Nome do produto").fill(name);
    await page
      .getByLabel("Descrição curta")
      .fill(mode === "zero" ? "App de treinos curtos em casa com progresso semanal." : "Agenda online para clínicas com lembretes por WhatsApp.");
    await page.getByRole("radio", { name: mode === "zero" ? /^B2C vende para pessoas/ : /^B2B vende para empresas/ }).click();
    if (mode === "existente") {
      await page.getByRole("button", { name: "Saúde" }).click();
      await page.getByLabel("Problema que resolve").fill("Clínicas perdem consultas por faltas e confirmam tudo por telefone.");
      await page.getByRole("radio", { name: "Primeiros clientes" }).click();
      await page.getByRole("radio", { name: /^Iniciante/ }).click();
      await page.getByRole("button", { name: "Supabase", exact: true }).click();
    }
    await page.getByRole("button", { name: "Ver recomendações" }).click();

    await expect(page.getByText("Escolhemos do catálogo o que mais combina")).toBeVisible();
    const cards = page.getByRole("tabpanel").getByRole("article");
    await expect(cards).toHaveCount(10);
    await expect(cards.first()).toContainText(`Faz sentido para o ${name}`);

    // Adiciona os 3 primeiros agentes, 2 skills e 1 MCP.
    for (let i = 0; i < 3; i++) await cards.nth(i).getByRole("button", { name: /^Adicionar/ }).click();
    await page.getByRole("tab", { name: /Skills/ }).click();
    for (let i = 0; i < 2; i++) await page.getByRole("tabpanel").getByRole("article").nth(i).getByRole("button", { name: /^Adicionar/ }).click();
    await page.getByRole("tab", { name: /MCPs/ }).click();
    if (mode === "existente") await expect(page.getByRole("heading", { name: "Supabase" })).toBeVisible();
    await page.getByRole("tabpanel").getByRole("article").first().getByRole("button", { name: /^Adicionar/ }).click();
    await expect(page.getByRole("button", { name: "Abrir carrinho, 6 itens" })).toBeVisible();

    // "Gerar mais" sem repetir.
    await page.getByRole("tab", { name: /Agentes/ }).click();
    await page.getByRole("button", { name: "Gerar mais sugestões" }).click();
    await expect(cards).toHaveCount(15);
    const titles = await cards.locator("h3").allTextContents();
    expect(new Set(titles).size).toBe(titles.length);

    await page.getByRole("button", { name: "Revisar o kit" }).click();
    await expect(page.getByText("É exatamente o que vai no zip")).toBeVisible();
    await page.getByRole("button", { name: "Gerar meu kit" }).click();
    await expect(page.getByRole("heading", { name: "Tudo aceso! Seu kit está pronto." })).toBeVisible({ timeout: 30_000 });

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Baixar .*\.zip/ }).click()]);
    const zip = await JSZip.loadAsync(await readFile((await download.path())!));
    const root = download.suggestedFilename().replace(/\.zip$/, "/");
    const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
    expect(files.filter((f) => f.startsWith(`${root}.claude/agents/`))).toHaveLength(3);
    expect(files.filter((f) => f.endsWith("/SKILL.md"))).toHaveLength(2);
    expect(files).toContain(`${root}.mcp.json`);
    const claude = await zip.file(`${root}CLAUDE.md`)!.async("string");
    expect(claude.includes("MODO DESCOBERTA ATIVO")).toBe(mode === "zero");
    expect(zip.file(`${root}BRIEFING.md`) !== null).toBe(mode === "zero");
    const leia = await zip.file(`${root}LEIA-ME.md`)!.async("string");
    expect(leia).not.toContain("não puderam ser personalizados");
    expect(personalizeCalls).toEqual([]);
  });
}
