import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { installAiMocks } from "./mocks";

async function openZip(page: Page) {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Baixar .*\.zip/ }).click()]);
  const path = await download.path();
  const zip = await JSZip.loadAsync(await readFile(path!));
  return { zip, name: download.suggestedFilename() };
}

test.beforeEach(async ({ page }) => {
  await installAiMocks(page);
});

test("landing apresenta o produto e leva ao assistente", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Acenda o seu SaaS." })).toBeVisible();
  await expect(page.getByText("Lume. Agentes, skills e MCPs são pontos de partida")).toBeVisible();
  await page.getByRole("link", { name: "Acender meu kit" }).first().click();
  await expect(page).toHaveURL(/\/montar$/);
  await expect(page.getByRole("heading", { name: "Como você vai usar o kit?" })).toBeVisible();
});

test("modo projeto existente: do formulário ao zip", async ({ page }) => {
  await page.goto("/montar");
  await page.getByRole("radio", { name: /Já tenho um projeto/ }).click();

  // Validação em português ao tentar avançar vazio.
  await page.getByRole("button", { name: "Ver recomendações" }).click();
  await expect(page.getByText("O nome precisa ter pelo menos 2 caracteres.")).toBeVisible();
  await expect(page.getByLabel("Nome do produto")).toBeFocused();

  await page.getByLabel("Nome do produto").fill("Agenda Clínica");
  const desc = "Agenda online para clínicas pequenas, com lembretes por WhatsApp.";
  await page.getByLabel("Descrição curta").fill(desc);
  await page.getByRole("radio", { name: /^B2B vende para empresas/ }).click();
  await page.getByRole("button", { name: "Saúde" }).click();
  await page.getByLabel("Problema que resolve").fill("Clínicas perdem consultas por faltas e confirmam tudo por telefone.");
  await page.getByRole("radio", { name: "MVP" }).click();
  await page.getByRole("radio", { name: /^Intermediário/ }).click();
  await expect(page.getByText(`${desc.length}/2000`)).toBeVisible();
  await page.getByRole("button", { name: "Ver recomendações" }).click();

  // Recomendações em streaming nas três abas.
  await expect(page.getByRole("heading", { name: "Sugestões para o Agenda Clínica" })).toBeVisible();
  const agentCards = page.getByRole("tabpanel").getByRole("article");
  await expect(agentCards).toHaveCount(9);
  await page.getByRole("button", { name: "Adicionar Suporte ao cliente ao kit" }).click();
  await page.getByRole("button", { name: "Adicionar Churn e retenção ao kit" }).click();

  // "Gerar mais" não repete itens.
  await page.getByRole("button", { name: "Gerar mais sugestões" }).click();
  await expect(agentCards).toHaveCount(13);
  const names = await agentCards.locator("h3").allTextContents();
  expect(new Set(names).size).toBe(names.length);

  await page.getByRole("tab", { name: /Skills/ }).click();
  await page.getByRole("button", { name: /^Adicionar .* ao kit$/ }).first().click();
  await page.getByRole("tab", { name: /MCPs/ }).click();
  await expect(page.getByText("Somente leitura").or(page.getByText("Escreve dados")).first()).toBeVisible();
  await page.getByRole("button", { name: "Adicionar GitHub ao kit" }).click();
  await expect(page.getByRole("button", { name: "Abrir carrinho, 4 itens" })).toBeVisible();

  // Carrinho persiste ao recarregar.
  await page.reload();
  await expect(page.getByRole("button", { name: "Abrir carrinho, 4 itens" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sugestões para o Agenda Clínica" })).toBeVisible();

  // Paleta de comandos adiciona item.
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Buscar agentes, skills, MCPs ou ações").fill("Checklist LGPD");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: /Checklist LGPD No kit/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir carrinho, 5 itens" })).toBeVisible();

  // Revisão: verificações e explorador.
  await page.getByRole("button", { name: "Revisar o kit" }).click();
  await expect(page.getByRole("heading", { name: "Revise o seu kit" })).toBeVisible();
  await expect(page.getByText("1 variável de ambiente para preencher")).toBeVisible();
  await expect(page.getByText("Suporte ao cliente e Base de conhecimento").or(page.getByText("Verificações"))).toBeVisible();
  await page.getByRole("treeitem").filter({ hasText: ".mcp.json" }).getByRole("button").click();
  await expect(page.getByText("${GITHUB_PERSONAL_ACCESS_TOKEN}").first()).toBeVisible();

  // Geração com progresso real e fallback por item.
  await page.getByRole("button", { name: "Gerar meu kit" }).click();
  await expect(page.getByRole("heading", { name: "Tudo aceso! Seu kit está pronto." })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Churn e retenção foi incluído com o\s+modelo base/)).toBeVisible();

  const { zip, name } = await openZip(page);
  expect(name).toBe("agenda-clinica-kit.zip");
  const root = "agenda-clinica-kit/";
  const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
  expect(files).toEqual(
    expect.arrayContaining([
      `${root}CLAUDE.md`,
      `${root}LEIA-ME.md`,
      `${root}PROMPT-DE-ATIVACAO.md`,
      `${root}.mcp.json`,
      `${root}.env.example`,
      `${root}.claude/agents/suporte-cliente.md`,
      `${root}.claude/agents/churn-retencao.md`,
      `${root}.claude/skills/checklist-lgpd/SKILL.md`,
    ]),
  );
  expect(files).not.toContain(`${root}BRIEFING.md`);
  const suporte = await zip.file(`${root}.claude/agents/suporte-cliente.md`)!.async("string");
  expect(suporte).toMatch(/^---\nname: suporte-cliente\ndescription: ".+"\ntools: .+\n---/);
  expect(suporte).toContain("personalizado-e2e");
  const claude = await zip.file(`${root}CLAUDE.md`)!.async("string");
  expect(claude).not.toContain("MODO DESCOBERTA ATIVO");
  expect(claude).toContain("Resumo de teste do SaaS");
  const leia = await zip.file(`${root}LEIA-ME.md`)!.async("string");
  expect(leia).toContain("não puderam ser personalizados");
  const mcp = JSON.parse(await zip.file(`${root}.mcp.json`)!.async("string"));
  expect(mcp.mcpServers.github.type).toBe("http");
});

test("modo do zero: kit pronto, Modo Descoberta e briefing", async ({ page }) => {
  await page.goto("/montar");
  await page.getByRole("radio", { name: /Vou começar do zero/ }).click();
  await expect(page.getByText("Pode deixar em branco, o Claude vai perguntar depois.").first()).toBeVisible();
  await page.getByLabel("Nome do produto").fill("Treino em Casa");
  await page.getByLabel("Descrição curta").fill("App de treinos curtos em casa com acompanhamento de progresso.");
  await page.getByRole("radio", { name: /^B2C vende para pessoas/ }).click();
  await page.getByRole("button", { name: "Ver recomendações" }).click();

  await expect(page.getByRole("tabpanel").getByRole("article")).toHaveCount(9);
  await page.getByRole("button", { name: "Adicionar kit" }).first().click();
  await expect(page.getByText(/Lançamento de MVP: \d+ itens novos no kit/)).toBeVisible();

  await page.getByRole("button", { name: "Revisar o kit" }).click();
  await page.getByRole("treeitem").filter({ hasText: "BRIEFING.md" }).getByRole("button").click();
  await expect(page.getByText("(a confirmar)").first()).toBeVisible();

  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("heading", { name: "Tudo aceso! Seu kit está pronto." })).toBeVisible({ timeout: 30_000 });

  const { zip } = await openZip(page);
  const root = "treino-em-casa-kit/";
  const claude = await zip.file(`${root}CLAUDE.md`)!.async("string");
  const firstSection = claude.indexOf("## ");
  expect(claude.indexOf("MODO DESCOBERTA ATIVO")).toBeGreaterThan(-1);
  expect(claude.indexOf("MODO DESCOBERTA ATIVO")).toBeLessThan(firstSection);
  expect(zip.file(`${root}BRIEFING.md`)).not.toBeNull();
  expect(zip.file(`${root}.claude/skills/brief-do-projeto/SKILL.md`)).not.toBeNull();
  const prompt = await zip.file(`${root}PROMPT-DE-ATIVACAO.md`)!.async("string");
  expect(prompt).toContain("MODO DESCOBERTA está ativo");

  // Montar outro kit limpa o estado.
  await page.getByRole("button", { name: "Montar outro kit" }).click();
  await expect(page.getByRole("heading", { name: "Como você vai usar o kit?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir carrinho, 0 itens" })).toBeVisible();
});

test("erro de IA mostra mensagem amigável e tentar de novo", async ({ page }) => {
  await page.unroute("**/api/recommend");
  let calls = 0;
  await page.route("**/api/recommend", async (route) => {
    calls++;
    if (calls === 1) {
      return route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "Você pediu muitas recomendações seguidas. Espere alguns minutos e tente de novo." }) });
    }
    const { mockRecommend } = await import("./mocks");
    return mockRecommend(route);
  });
  await page.goto("/montar");
  await page.getByRole("radio", { name: /Vou começar do zero/ }).click();
  await page.getByLabel("Nome do produto").fill("Teste Erro");
  await page.getByLabel("Descrição curta").fill("Produto para testar o estado de erro.");
  await page.getByRole("radio", { name: /^B2B vende para empresas/ }).click();
  await page.getByRole("button", { name: "Ver recomendações" }).click();
  await expect(page.getByText("Faltou luz por aqui")).toBeVisible();
  await expect(page.getByText("Você pediu muitas recomendações seguidas.")).toBeVisible();
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByRole("tabpanel").getByRole("article")).toHaveCount(9);
});
