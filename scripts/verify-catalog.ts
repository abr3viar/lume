/**
 * Valida todos os templates do catálogo: esquema zod (na importação), ids únicos,
 * frontmatter gerado, MCPs com docsUrl e verifiedAt, e ausência de segredos.
 * Uso: npm run verify:catalog
 */
import { agents, catalogStats, mcps, presets, skills } from "../src/data/catalog";
import { agentFile, skillFiles, mcpJson } from "../src/lib/kit/build";
import { parseFrontmatter } from "../src/lib/kit/frontmatter";
import { findSecrets } from "../src/lib/kit/secrets";

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const MIN = { agents: 30, skills: 20, mcps: 15 };
if (agents.length < MIN.agents) fail(`Agentes: ${agents.length} (mínimo ${MIN.agents})`);
if (skills.length < MIN.skills) fail(`Skills: ${skills.length} (mínimo ${MIN.skills})`);
if (mcps.length < MIN.mcps) fail(`MCPs: ${mcps.length} (mínimo ${MIN.mcps})`);

for (const a of agents) {
  const f = agentFile({ item: a, description: a.whenToUse, prompt: a.systemPrompt, personalized: false });
  const fm = parseFrontmatter(f.content);
  if (!fm) fail(`Agente ${a.id}: frontmatter inválido`);
  else {
    if (fm.data.name !== a.id) fail(`Agente ${a.id}: name diferente do id`);
    if (!fm.data.description) fail(`Agente ${a.id}: sem description`);
    if (!fm.data.tools) fail(`Agente ${a.id}: sem tools`);
  }
  if (a.systemPrompt.length < 1200) fail(`Agente ${a.id}: system prompt curto (${a.systemPrompt.length})`);
  if (findSecrets(f.content).length) fail(`Agente ${a.id}: conteúdo com aparência de segredo`);
}

for (const s of skills) {
  const fs = skillFiles({ item: s, description: s.description, body: s.body, personalized: false });
  const fm = parseFrontmatter(fs[0].content);
  if (!fm) fail(`Skill ${s.id}: frontmatter inválido`);
  else if (fm.data.name !== s.id || !fm.data.description) fail(`Skill ${s.id}: name/description inválidos`);
  if (!/Use (quando|ao|antes|logo)/.test(s.description)) fail(`Skill ${s.id}: description não diz quando usar`);
  if (s.description.length > 1536) fail(`Skill ${s.id}: description acima de 1536 caracteres`);
  for (const f of fs) if (findSecrets(f.content).length) fail(`Skill ${s.id}: segredo em ${f.path}`);
}

const today = new Date().toISOString().slice(0, 10);
for (const m of mcps) {
  if (!m.docsUrl.startsWith("https://")) fail(`MCP ${m.id}: docsUrl sem https`);
  if (!m.verifiedAt || m.verifiedAt > today) fail(`MCP ${m.id}: verifiedAt inválido (${m.verifiedAt})`);
  for (const e of m.requiredEnvVars) if (!e.whereToGet.startsWith("https://")) fail(`MCP ${m.id}: ${e.name} sem link de origem`);
}
const json = JSON.parse(mcpJson(mcps));
if (Object.keys(json.mcpServers).length !== mcps.length) fail("mcpJson perdeu servidores");
if (findSecrets(JSON.stringify(json)).length) fail("Configuração de MCP com aparência de segredo");

if (errors.length) {
  console.error(`\n✘ Catálogo inválido (${errors.length} problemas):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `✔ Catálogo válido: ${catalogStats.agents} agentes, ${catalogStats.skills} skills, ${catalogStats.mcps} MCPs, ${presets.length} kits prontos.`,
);
