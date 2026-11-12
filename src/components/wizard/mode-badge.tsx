"use client";

import { Cpu, Sparkles, Zap } from "lucide-react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { useKit } from "@/store/kit-store";

const ICON = { "claude-code": Cpu, api: Sparkles, local: Zap };

/** Mostra qual IA está trabalhando (ou se o Lume está no modo sem IA) e o que isso muda. */
export function ModeBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  const provider = useKit((s) => s.aiProvider);
  if (!provider) return null;
  const mode = brand.aiModes[provider];
  const Icon = ICON[provider];
  return (
    <div
      role="status"
      data-testid="modo-ativo"
      className={cn("flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm", className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
      <p className="text-pretty text-ink-2">
        <span className="font-medium text-ink">{mode.label}.</span>
        {!compact && <> {mode.detail}</>}
      </p>
    </div>
  );
}
