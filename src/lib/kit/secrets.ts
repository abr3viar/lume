/**
 * Padrões de segredos conhecidos. Usado para garantir que nada parecido com
 * uma credencial real vá para o zip (e nos testes).
 */
const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{10,}/,
  /\bsk-(live|test|proj)?[-_]?[A-Za-z0-9]{20,}/,
  /\brk_(live|test)_[A-Za-z0-9]{10,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
];

export function findSecrets(text: string): string[] {
  return SECRET_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
}

export function redactSecrets(text: string): string {
  let out = text;
  for (const re of SECRET_PATTERNS) out = out.replace(new RegExp(re.source, "g"), "[REMOVIDO]");
  return out;
}
