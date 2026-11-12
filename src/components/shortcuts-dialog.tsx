"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { isMac } from "@/lib/utils";
import { useUi } from "@/store/kit-store";

const noop = () => () => {};
/** "⌘" no Mac, "Ctrl" nos demais. No servidor sempre "Ctrl"; corrige após hidratar, sem erro. */
export function useModKey() {
  return useSyncExternalStore(noop, () => (isMac() ? "⌘" : "Ctrl"), () => "Ctrl");
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line-strong bg-surface px-1.5 font-mono text-[0.72rem] text-ink-2 shadow-[inset_0_-1px_0_var(--line-strong)]">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog() {
  const open = useUi((s) => s.shortcutsOpen);
  const set = useUi((s) => s.set);
  const mod = useModKey();
  const rows: [React.ReactNode, string][] = [
    [<><Kbd>{mod}</Kbd><Kbd>K</Kbd></>, "Abrir a paleta de comandos"],
    [<><Kbd>{mod}</Kbd><Kbd>B</Kbd></>, "Abrir ou fechar o carrinho"],
    [<><Kbd>{mod}</Kbd><Kbd>Enter</Kbd></>, "Avançar para a próxima etapa"],
    [<><Kbd>Alt</Kbd><Kbd>←</Kbd></>, "Voltar uma etapa"],
    [<><Kbd>1</Kbd><Kbd>2</Kbd><Kbd>3</Kbd></>, "Trocar de aba nas recomendações"],
    [<Kbd key="q">?</Kbd>, "Mostrar estes atalhos"],
  ];
  return (
    <Dialog.Root open={open} onOpenChange={(o) => set({ shortcutsOpen: o })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px] [[data-theme=dark]_&]:bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-line bg-bg p-6 shadow-lift animate-[pop-in_180ms_var(--ease-out-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-semibold tracking-tight">Atalhos de teclado</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fechar">
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Lista de atalhos disponíveis no Lume.</Dialog.Description>
          <ul className="divide-y divide-line">
            {rows.map(([keys, label]) => (
              <li key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-ink-2">{label}</span>
                <span className="flex gap-1">{keys}</span>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
