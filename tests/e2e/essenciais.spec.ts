import { expect, test } from "@playwright/test";

/** Kit enxuto: selos Essencial/Opcional, "Adicionar essenciais" e contador por tipo (sem mocks). */
test("adicionar essenciais coloca no kit só os itens marcados como essenciais", async ({ page }) => {
  await page.goto("/montar");
  await page.getByRole("radio", { name: /Vou começar do zero/ }).click();
  await page.getByLabel("Nome do produto").fill("Treino em Casa");
  await page.getByLabel("O que o produto faz e para quem").fill("App de treinos curtos em casa com progresso semanal.");
  await page.getByRole("radio", { name: /^B2C vende para pessoas/ }).click();
  await page.getByRole("button", { name: "Ver recomendações" }).click();

  await expect(page.getByText("Comece enxuto.")).toBeVisible();
  // Conta os essenciais nas três abas.
  let essentials = 0;
  for (const tab of [/Agentes/, /Skills/, /MCPs/]) {
    await page.getByRole("tab", { name: tab }).click();
    essentials += await page.getByRole("tabpanel").getByText("Essencial", { exact: true }).count();
  }
  expect(essentials).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Adicionar essenciais" }).click();
  await expect(page.getByRole("button", { name: `Abrir carrinho, ${essentials} itens` })).toBeVisible();
  await expect(page.getByRole("button", { name: "Essenciais no kit" })).toBeDisabled();
  // Contador por tipo no rodapé, ex.: "4 agentes e 3 skills".
  await expect(page.getByText(/^\d+ agentes?(,| e) \d+ /)).toBeVisible();
});
