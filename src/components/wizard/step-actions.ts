"use client";

import { useEffect } from "react";

/** A etapa ativa registra aqui o que "avançar" significa (usado pelo atalho Ctrl/⌘ + Enter). */
export const stepActions: { next: (() => void) | null } = { next: null };

export function useStepNext(fn: (() => void) | null) {
  useEffect(() => {
    stepActions.next = fn;
    return () => {
      if (stepActions.next === fn) stepActions.next = null;
    };
  });
}
