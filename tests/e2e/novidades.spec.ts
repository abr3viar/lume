import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

/** Site comum, sites de referência (API simulada) e kit no formato do Codex, sem IA. */
test("site com referência visual, exportado para o Codex", async ({ page }) => {
  await page.route("**/api/reference", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reference: {
          url: "https://exemplo-bonito.com/",
          title: "Exemplo Bonito",
          description: "",
          fonts: ["Satoshi"],
          colors: ["#c5fe41", "#14130e"],
          tokens: ["--brand: #C5FE41"],
          radii: ["999px"],
          fontSizes: ["17px"],
          outline: ["H1: Um título grande e limpo"],
          html: "<main><h1>Um título grande e limpo</h1></main>",
          truncated: false,
        },
      }),
    }),
  );

  await page.goto("/montar");
  await page.getByRole("radio", { name: /Já tenho um projeto/ }).click();
  await page.getByRole("radio", { name: /^Site/ }).click();
  await expect(page.getByRole("radiogroup", { name: "Modelo de negócio" })).toHaveCount(0);
  await page.getByLabel("Nome do produto").fill("Pizzaria do Bairro");
  await page.getByLabel("O que o site faz e para quem").fill("Site de uma pizzaria de bairro com cardápio, horários, mapa e pedido pelo WhatsApp.");

  await page.getByLabel("Sites que você acha bonitos").fill("exemplo-bonito.com");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByTestId("referencias")).toContainText("Exemplo Bonito");

  await page.getByRole("button", { name: "Ver recomendações" }).click();
  await expect(page.getByTestId("etapa-atual")).toContainText("Etapa 3 de 5");
  await page.getByRole("button", { name: "Adicionar essenciais" }).click();
  await page.getByRole("button", { name: "Revisar o kit" }).click();

  await page.getByRole("radio", { name: "Codex" }).click();
  await expect(page.getByRole("treeitem").filter({ hasText: "AGENTS.md" })).toBeVisible();

  await page.getByRole("button", { name: "Gerar meu kit" }).click();
  await expect(page.getByRole("heading", { name: "Tudo aceso! Seu kit está pronto." })).toBeVisible({ timeout: 30_000 });
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Baixar .*\.zip/ }).click()]);
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  const root = "pizzaria-do-bairro-kit/";
  const agents = await zip.file(`${root}AGENTS.md`)!.async("string");
  expect(agents).toContain("Contexto do site");
  expect(agents).toContain("## Referências visuais");
  expect(agents).not.toMatch(/\bSaaS\b/);
  expect(zip.file(`${root}CLAUDE.md`)).toBeNull();
  expect(zip.file(`${root}.agents/skills/metodo-lume/SKILL.md`)).not.toBeNull();
  expect(zip.file(`${root}referencias-visuais/01-exemplo-bonito.com.md`)).not.toBeNull();
  const meta = JSON.parse(await zip.file(`${root}lume-kit.json`)!.async("string"));
  expect(meta.ferramenta).toBe("codex");
});
