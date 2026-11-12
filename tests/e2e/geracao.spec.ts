import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { mockPersonalize, mockRecommend } from "./mocks";

/** Monta um kit (modo existente) com a IA mockada e vai até a etapa de geração. */
async function startKit(page: Page) {
  await page.goto("/montar");
  await page.getByRole("radio", { name: /Já tenho um projeto/ }).click();
  await page.getByLabel("Nome do produto").fill("Agenda Clínica");
  await page.getByLabel("O que o produto faz e para quem").fill("Agenda online para clínicas pequenas, com lembretes por WhatsApp.");
  await page.getByRole("radio", { name: /^B2B vende para empresas/ }).click();
  await page.getByRole("button", { name: "Saúde" }).click();
  await page.getByLabel("Problema que resolve").fill("Clínicas perdem consultas por faltas e confirmam tudo por telefone.");
  await page.getByRole("radio", { name: "MVP" }).click();
  await page.getByRole("radio", { name: /^Intermediário/ }).click();
  await page.getByRole("button", { name: "Ver recomendações" }).click();
  await page.getByRole("button", { name: "Adicionar Suporte ao cliente ao kit" }).click();
  await page.getByRole("button", { name: "Adicionar Base de conhecimento e FAQ ao kit" }).click();
  await page.getByRole("button", { name: "Adicionar Onboarding de usuários ao kit" }).click();
  await page.getByRole("button", { name: "Revisar o kit" }).click();
  await page.getByRole("button", { name: "Gerar meu kit" }).click();
}

test("fallback visível e 'tentar de novo' refaz só o item que falhou", async ({ page }) => {
  await page.route("**/api/recommend", mockRecommend);
  // Onboarding falha só na primeira vez; na nova tentativa, funciona.
  const calls: string[] = [];
  let onboardingFailed = false;
  await page.route("**/api/personalize", async (route) => {
    const body = route.request().postDataJSON() as { id?: string; kind: string };
    calls.push(body.id ?? body.kind);
    if (body.id === "onboarding-usuarios" && !onboardingFailed) {
      onboardingFailed = true;
      return route.fulfill({ status: 422, contentType: "application/json", body: '{"error":"x"}' });
    }
    return mockPersonalize(route);
  });

  await startKit(page);
  await expect(page.getByRole("heading", { name: "Tudo aceso! Seu kit está pronto." })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("fallbacks")).toContainText("Onboarding de usuários");

  calls.length = 0;
  await page.getByRole("button", { name: "Tentar de novo só este item" }).click();
  await expect(page.getByRole("heading", { name: "Tudo aceso! Seu kit está pronto." })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("fallbacks")).toHaveCount(0);
  expect(calls).toEqual(["onboarding-usuarios"]);
});

test("download parcial durante a geração", async ({ page }) => {
  await page.route("**/api/recommend", mockRecommend);
  let n = 0;
  await page.route("**/api/personalize", async (route) => {
    // A primeira resposta é rápida; as demais demoram, para dar tempo de baixar o parcial.
    if (n++ > 0) await new Promise((r) => setTimeout(r, 4000));
    return mockPersonalize(route);
  });

  await startKit(page);
  const partial = page.getByRole("button", { name: "Baixar o que já está pronto" });
  await expect(partial).toBeEnabled({ timeout: 15_000 });
  const [download] = await Promise.all([page.waitForEvent("download"), partial.click()]);
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  expect(Object.keys(zip.files)).toContain("agenda-clinica-kit/CLAUDE.md");
  const leia = await zip.file("agenda-clinica-kit/LEIA-ME.md")!.async("string");
  expect(leia).toContain("não puderam ser personalizados");
  await expect(page.getByText(/Zip parcial baixado/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tudo aceso! Seu kit está pronto." })).toBeVisible({ timeout: 30_000 });
});
