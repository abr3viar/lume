import { expect, test } from "@playwright/test";

/** Assistente: etapa N de 5, exemplos clicáveis, aviso de descrição vaga e voltar sem perder dados (sem mocks). */
test("descrição vaga pede detalhes, exemplos preenchem e voltar mantém as respostas", async ({ page }) => {
  await page.goto("/montar");
  await expect(page.getByTestId("etapa-atual")).toContainText("Etapa 1 de 5");
  await page.getByRole("radio", { name: /Vou começar do zero/ }).click();
  await expect(page.getByTestId("etapa-atual")).toContainText("Etapa 2 de 5");

  // Do zero: "Mais detalhes" começa fechado e os campos opcionais ficam escondidos.
  await expect(page.getByLabel("Problema que resolve")).toBeHidden();

  // Descrição vaga: pede detalhes antes de seguir.
  await page.getByLabel("Nome do produto").fill("Meu App");
  await page.getByLabel("O que o produto faz e para quem").fill("Um aplicativo de gestão para empresas");
  await page.getByRole("radio", { name: /^B2B vende para empresas/ }).click();
  await page.getByRole("button", { name: "Ver recomendações" }).click();
  await expect(page.getByTestId("aviso-vago")).toContainText("Para quem é o produto e qual problema ele resolve?");
  await expect(page.getByTestId("etapa-atual")).toContainText("Etapa 2 de 5");

  // Exemplo clicável preenche o campo e o aviso some.
  await page.getByRole("button", { name: /Usar exemplo: Agenda online para clínicas/ }).click();
  await expect(page.getByLabel("O que o produto faz e para quem")).toHaveValue(/Agenda online para clínicas pequenas/);
  await expect(page.getByTestId("aviso-vago")).toHaveCount(0);

  // Abre "Mais detalhes", preenche um opcional e segue.
  await page.getByTestId("mais-detalhes").locator("summary").click();
  await page.getByLabel("Problema que resolve").fill("Clínicas perdem consultas por faltas.");
  await page.getByRole("button", { name: "Ver recomendações" }).click();
  await expect(page.getByTestId("etapa-atual")).toContainText("Etapa 3 de 5");

  // Voltar mantém tudo o que foi preenchido.
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByLabel("Nome do produto")).toHaveValue("Meu App");
  await expect(page.getByLabel("O que o produto faz e para quem")).toHaveValue(/Agenda online para clínicas/);
  await expect(page.getByLabel("Problema que resolve")).toHaveValue("Clínicas perdem consultas por faltas.");
});

test("dá para seguir com a descrição vaga se a pessoa quiser", async ({ page }) => {
  await page.goto("/montar");
  await page.getByRole("radio", { name: /Já tenho um projeto/ }).click();
  await page.getByLabel("Nome do produto").fill("Meu App");
  await page.getByLabel("O que o produto faz e para quem").fill("Um sistema simples para empresas");
  await page.getByRole("radio", { name: /^B2C vende para pessoas/ }).click();
  await page.getByRole("button", { name: "Ver recomendações" }).click();
  await page.getByRole("button", { name: "Continuar assim mesmo" }).click();
  await expect(page.getByTestId("etapa-atual")).toContainText("Etapa 3 de 5");
});
