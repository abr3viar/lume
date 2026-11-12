import type { CatalogAgent } from "./index";
import type { Skill } from "./schema";
import { AGENT_TRIGGERS } from "./triggers";

/** Frases vagas que não ajudam o Claude a decidir quando usar um item. */
export const VAGUE_PHRASES = [
  "em geral",
  "diversas tarefas",
  "qualquer tarefa",
  "várias coisas",
  "ajudar com tudo",
  "tarefas gerais",
  "o que precisar",
  "para tudo",
];

const TRIGGER_START = /^Use (quando|ao|para|antes|logo|depois)\b/;
const SKILL_TRIGGER = /Use (quando|ao|antes|logo)\b/;

/**
 * Regras de qualidade do catálogo (rodam no `verify:catalog` e nos testes):
 * - descrições com gatilho concreto e sem frases vagas;
 * - exemplos de pedido para cada agente;
 * - permissões mínimas: agente "leitura" não edita; Bash só com permissionMode "plan".
 */
export function catalogQualityIssues(agents: CatalogAgent[], skills: Skill[]): string[] {
  const issues: string[] = [];
  const vague = (text: string) => VAGUE_PHRASES.find((p) => text.toLowerCase().includes(p));

  for (const a of agents) {
    if (!TRIGGER_START.test(a.whenToUse)) issues.push(`Agente ${a.id}: a descrição deve começar com "Use quando/ao/para..."`);
    if (a.whenToUse.length < 60) issues.push(`Agente ${a.id}: descrição curta demais (${a.whenToUse.length} caracteres, mínimo 60)`);
    const v = vague(a.whenToUse);
    if (v) issues.push(`Agente ${a.id}: descrição vaga ("${v}")`);
    const triggers = AGENT_TRIGGERS[a.id] ?? [];
    if (triggers.length < 3) issues.push(`Agente ${a.id}: precisa de pelo menos 3 exemplos de pedido em triggers.ts`);
    for (const t of triggers) if (t.length < 10) issues.push(`Agente ${a.id}: exemplo de pedido curto demais ("${t}")`);

    const writes = a.tools.filter((t) => t === "Edit" || t === "Write");
    if (a.access === "leitura" && writes.length) issues.push(`Agente ${a.id}: é só leitura mas tem ${writes.join(", ")}`);
    if (a.access === "leitura" && a.tools.includes("Bash") && a.permissionMode !== "plan")
      issues.push(`Agente ${a.id}: só leitura com Bash precisa de permissionMode "plan"`);
    if (a.permissionMode === "plan" && a.access !== "leitura") issues.push(`Agente ${a.id}: permissionMode "plan" só para agentes de leitura`);
    if (/não edite arquivos/i.test(a.prompt.rules.join(" ")) && a.access !== "leitura")
      issues.push(`Agente ${a.id}: as regras dizem "não edite arquivos", então access deve ser "leitura"`);
  }

  const ids = new Set(agents.map((a) => a.id));
  for (const id of Object.keys(AGENT_TRIGGERS)) if (!ids.has(id)) issues.push(`triggers.ts: agente inexistente "${id}"`);

  for (const s of skills) {
    if (!SKILL_TRIGGER.test(s.description)) issues.push(`Skill ${s.id}: a description precisa dizer quando usar ("Use quando...")`);
    if (s.description.length < 120) issues.push(`Skill ${s.id}: description curta demais (${s.description.length}, mínimo 120)`);
    const v = vague(s.description);
    if (v) issues.push(`Skill ${s.id}: description vaga ("${v}")`);
  }
  return issues;
}
