"use client";

import { Boxes, Code2, Gem, MousePointer2, Sparkles, Terminal, type LucideIcon } from "lucide-react";
import { TARGET_IDS, TARGETS, type KitTarget } from "@/lib/kit/targets";
import { cn } from "@/lib/utils";
import { useKit } from "@/store/kit-store";

const ICON: Record<KitTarget, LucideIcon> = {
  "claude-code": Sparkles,
  codex: Terminal,
  gemini: Gem,
  cursor: MousePointer2,
  grok: Code2,
  outra: Boxes,
};

/** Escolha da ferramenta de IA. O conteúdo do kit é o mesmo; muda o formato dos arquivos. */
export function TargetPicker() {
  const target = useKit((s) => s.target);
  const setTarget = useKit((s) => s.setTarget);
  return (
    <section aria-labelledby="target-title">
      <h2 id="target-title" className="mb-1 font-semibold">
        Onde você vai usar o kit
      </h2>
      <p className="mb-3 text-sm text-ink-3">A IA é o motor; o kit vem no formato que ela lê.</p>
      <div role="radiogroup" aria-labelledby="target-title" className="grid grid-cols-2 gap-2">
        {TARGET_IDS.map((id) => {
          const t = TARGETS[id];
          const Icon = ICON[id];
          const on = id === target;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              title={t.blurb}
              onClick={() => setTarget(id)}
              className={cn(
                "group flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm transition-[border-color,background-color,transform] duration-200 ease-out-soft active:scale-[0.98]",
                on ? "border-ink bg-ink text-bg" : "border-line hover:border-line-strong hover:bg-surface",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg transition-colors",
                  on ? "bg-brand text-brand-ink" : "bg-surface-2 text-ink-2 group-hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-3" aria-live="polite">
        {TARGETS[target].blurb}
      </p>
    </section>
  );
}
