import { test, type Page } from "@playwright/test";
import { installAiMocks } from "./mocks";

/**
 * Capturas para revisão visual (não é um teste de regressão).
 * Uso: SCREENS=1 SCREENS_DIR=caminho npx playwright test screens
 */
test.skip(!process.env.SCREENS, "Só roda com SCREENS=1");

const DIR = process.env.SCREENS_DIR ?? "test-results/screens";

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((t) => localStorage.setItem("lume-theme", t), theme);
}

for (const theme of ["light", "dark"] as const) {
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`telas ${theme} ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setTheme(page, theme);
      await installAiMocks(page);
      const shot = (n: string, fullPage = false) =>
        page.screenshot({ path: `${DIR}/${theme}-${vp.name}-${n}.png`, fullPage, animations: "disabled" });

      await page.goto("/");
      await page.waitForTimeout(2600);
      await shot("01-landing", true);

      await page.goto("/montar");
      await shot("02-modo");
      await page.getByRole("radio", { name: /Já tenho um projeto/ }).click();
      await page.getByRole("button", { name: "Ver recomendações" }).click();
      await shot("03-sobre-erros");
      await page.getByLabel("Nome do produto").fill("Agenda Clínica");
      await page.getByLabel("O que o produto faz e para quem").fill("Agenda online para clínicas pequenas, com lembretes por WhatsApp.");
      await page.getByRole("radio", { name: /^B2B vende para empresas/ }).click();
      await page.getByRole("button", { name: "Saúde" }).click();
      await page.getByLabel("Problema que resolve").fill("Clínicas perdem consultas por faltas.");
      await page.getByRole("radio", { name: "MVP" }).click();
      await page.getByRole("radio", { name: /^Intermediário/ }).click();
      await page.getByRole("button", { name: "Ver recomendações" }).click();
      await page.getByRole("tabpanel").getByRole("article").nth(5).waitFor();
      await page.getByRole("button", { name: "Adicionar Suporte ao cliente ao kit" }).click();
      await page.waitForTimeout(800);
      await shot("04-recs", true);
      await page.getByRole("tab", { name: /MCPs/ }).click();
      await page.getByRole("button", { name: "Adicionar GitHub ao kit" }).click();
      await page.getByRole("button", { name: "Adicionar Playwright ao kit" }).click();
      await page.waitForTimeout(800);
      await shot("05-mcps");
      await page.getByRole("button", { name: /Abrir carrinho/ }).click();
      await page.waitForTimeout(500);
      await shot("06-carrinho");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Revisar o kit" }).click();
      await page.waitForTimeout(1200);
      await shot("07-revisao", true);
      await page.getByRole("button", { name: "Gerar meu kit" }).click();
      await page.getByRole("heading", { name: /Tudo aceso/ }).waitFor();
      await page.waitForTimeout(600);
      await shot("08-sucesso");
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(400);
      await shot("09-paleta");
    });
  }
}
