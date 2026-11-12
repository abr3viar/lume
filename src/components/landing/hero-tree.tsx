/**
 * Prévia do zip: a árvore acende linha a linha, como um pavio.
 * Só CSS: sem JavaScript, e estática para quem prefere menos movimento.
 */
const ROWS: { prefix: string; name: string; dir?: boolean; note?: string }[] = [
  { prefix: "", name: "agenda-clinica-kit/", dir: true },
  { prefix: "├── ", name: ".claude/", dir: true },
  { prefix: "│   ├── ", name: "agents/", dir: true },
  { prefix: "│   │   ├── ", name: "suporte-cliente.md" },
  { prefix: "│   │   ├── ", name: "onboarding-usuarios.md" },
  { prefix: "│   │   └── ", name: "seguranca-owasp.md" },
  { prefix: "│   └── ", name: "skills/", dir: true },
  { prefix: "│       ├── ", name: "checklist-lgpd/SKILL.md" },
  { prefix: "│       └── ", name: "plano-onboarding/SKILL.md" },
  { prefix: "├── ", name: ".mcp.json", note: "sem segredos" },
  { prefix: "├── ", name: ".env.example" },
  { prefix: "├── ", name: "CLAUDE.md", note: "contexto do seu SaaS" },
  { prefix: "├── ", name: "LEIA-ME.md", note: "passo a passo" },
  { prefix: "└── ", name: "PROMPT-DE-ATIVACAO.md" },
];

export function HeroTree() {
  return (
    <figure
      aria-label="Exemplo do conteúdo do zip gerado pelo Lume"
      className="relative rounded-[1.75rem] border border-line bg-surface p-2 shadow-lift"
    >
      <div className="flex items-center justify-between rounded-[1.35rem] border-b border-line bg-bg px-5 py-3">
        <span className="font-mono text-xs text-ink-2">agenda-clinica-kit.zip</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-3">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-brand" />
          </span>
          gerado agora
        </span>
      </div>
      <ol className="relative overflow-hidden px-5 py-5 font-mono text-[0.78rem] leading-[1.9] sm:text-[0.84rem]">
        {ROWS.map((r, i) => (
          <li
            key={r.name + i}
            style={{ "--i": i } as React.CSSProperties}
            className="ignite flex items-baseline whitespace-pre"
          >
            <span className="fuse text-ink-3">{r.prefix}</span>
            <span className={r.dir ? "font-medium text-ink" : "text-ink-2"}>{r.name}</span>
            {r.note && (
              <span className="ml-3 hidden truncate font-sans text-[0.72rem] text-ink-3 sm:inline">{r.note}</span>
            )}
          </li>
        ))}
      </ol>
      <style>{`
        .ignite { animation: ignite 600ms var(--ease-out-soft) both; animation-delay: calc(var(--i) * 120ms + 250ms); }
        .ignite .fuse { animation: fuse 900ms ease-out both; animation-delay: calc(var(--i) * 120ms + 250ms); }
        @keyframes ignite { from { opacity: .18; transform: translateX(-4px); } }
        @keyframes fuse { 0% { color: var(--ink-3); } 35% { color: var(--brand); text-shadow: 0 0 10px var(--brand); } 100% { color: var(--ink-3); } }
        [data-theme="light"] .ignite .fuse { animation-name: fuse-light; }
        @keyframes fuse-light { 0% { color: var(--ink-3); } 35% { color: #b58c00; } 100% { color: var(--ink-3); } }
      `}</style>
    </figure>
  );
}
