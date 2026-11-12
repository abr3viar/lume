/** Serializa um valor para YAML como string entre aspas duplas, sempre segura. */
export function yamlString(value: string): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return `"${oneLine.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function frontmatter(fields: Record<string, string | undefined>): string {
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

/** Parser mínimo de frontmatter (usado em testes e na verificação do catálogo). */
export function parseFrontmatter(md: string): { data: Record<string, string>; body: string } | null {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  if (!m) return null;
  const data: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) return null;
    let v = kv[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    data[kv[1]] = v;
  }
  return { data, body: m[2] };
}
