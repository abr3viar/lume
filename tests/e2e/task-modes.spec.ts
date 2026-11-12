import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

/** Modos "consertar um erro" e "atualização rápida", sem mocks (rotas reais, modo sem IA). */
const CASES = [
  {
    mode: "erro" as const,
    card: /Consertar um erro/,
    heading: "Conte qual é o erro",
    taskLabel: "O que está dando errado?",
    task: "Ao salvar um agendamento a página dá erro 500 e nada é salvo.",
    detailsLabel: "Como reproduzir e mensagem de erro",
    details: "1. Entrar em /agenda 2. Clicar em Novo 3. Salvar. Console: TypeError reading id",
    preset: "Conserto de erro",
    firstAgent: "Triagem de bugs",
    mark: "MODO CONSERTO ATIVO",
  },
  {
    mode: "ajuste" as const,
    card: /Fazer uma atualização rápida/,
    heading: "Conte o que você quer mudar",
    taskLabel: "O que você quer mudar?",
    task: "Trocar o texto do botão de cadastro para Criar minha conta.",
    detailsLabel: "Onde fica e restrições",
    details: "Página /cadastro. Não mudar o layout.",
    preset: "Ajuste rápido",
    firstAgent: "Copy de landing page",
    mark: "MODO AJUSTE RÁPIDO ATIVO",
  },
];

for (const c of CASES) {
  test(`modo ${c.mode}: formulário curto, kit enxuto, TAREFA.md e regras no CLAUDE.md`, async ({ page }) => {
    await page.goto("/montar");
    await page.getByRole("radio", { name: c.card }).click();
    await expect(page.getByRole("heading", { name: c.heading })).toBeVisible();

    // Formulário curto: sem modelo de negócio, nicho ou estágio.
    await expect(page.getByLabel("Problema que resolve")).toHaveCount(0);
    await expect(page.getByRole("radiogroup", { name: "Modelo de negócio" })).toHaveCount(0);

    await page.getByLabel("Nome do projeto").fill("Agenda Clínica");
    await page.getByRole("button", { name: "Ver recomendações" }).click();
    await expect(page.getByText(c.mode === "erro" ? "Descreva o erro em pelo menos 10 caracteres." : "Descreva a mudança em pelo menos 10 caracteres.")).toBeVisible();
    await page.getByLabel(c.taskLabel).fill(c.task);
    await page.getByLabel(c.detailsLabel).fill(c.details);
    await page.getByRole("button", { name: "Ver recomendações" }).click();

    const cards = page.getByRole("tabpanel").getByRole("article");
    await expect(cards).toHaveCount(4);
    await expect(cards.first().locator("h3")).toHaveText(c.firstAgent);
    await expect(page.getByRole("heading", { name: c.preset })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Crescimento B2B" })).toHaveCount(0);

    await page.getByRole("heading", { name: c.preset }).locator("..").getByRole("button", { name: "Adicionar kit" }).click();
    await page.getByRole("button", { name: "Revisar o kit" }).click();
    await page.getByRole("treeitem").filter({ hasText: "TAREFA.md" }).getByRole("button").click();
    await expect(page.getByText(c.task).first()).toBeVisible();

    await page.getByRole("button", { name: "Gerar meu kit" }).click();
    await expect(page.getByRole("heading", { name: "Tudo aceso! Seu kit está pronto." })).toBeVisible({ timeout: 30_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Baixar .*\.zip/ }).click()]);
    const zip = await JSZip.loadAsync(await readFile((await download.path())!));
    const root = "agenda-clinica-kit/";
    const claude = await zip.file(`${root}CLAUDE.md`)!.async("string");
    expect(claude).toContain(c.mark);
    expect(claude).not.toContain("MODO DESCOBERTA ATIVO");
    const tarefa = await zip.file(`${root}TAREFA.md`)!.async("string");
    expect(tarefa).toContain(c.task);
    expect(tarefa).toContain(c.details);
    expect(zip.file(`${root}BRIEFING.md`)).toBeNull();
  });
}
