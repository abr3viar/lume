"use client";

import { Command } from "cmdk";
import { Check, Keyboard, Moon, Plus, RotateCcw, ShoppingBag, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-toggle";
import { agents, mcps, skills, type ItemKind } from "@/data/catalog";
import { KIND_LABEL } from "@/lib/item-meta";
import { useKit, useUi } from "@/store/kit-store";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink";
const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3";

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const set = useUi((s) => s.set);
  const cart = useKit((s) => s.cart);
  const toggle = useKit((s) => s.toggle);
  const { toggle: toggleTheme, theme } = useTheme();
  const router = useRouter();

  const close = () => set({ paletteOpen: false });
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  const toggleItem = (kind: ItemKind, id: string, name: string) => () => {
    const added = toggle(kind, id);
    if (added) useUi.setState((s) => ({ cartPulse: s.cartPulse + 1 }));
    toast(added ? `${name} entrou no kit` : `${name} saiu do kit`);
  };

  const groups: { kind: ItemKind; items: { id: string; name: string; category: string }[] }[] = [
    { kind: "agent", items: agents },
    { kind: "skill", items: skills },
    { kind: "mcp", items: mcps },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => set({ paletteOpen: o })}
      label="Paleta de comandos"
      overlayClassName="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px] [[data-theme=dark]_&]:bg-black/60"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-line bg-bg shadow-lift animate-[pop-in_180ms_var(--ease-out-soft)]"
    >
      <Command.Input
        placeholder="Buscar agentes, skills, MCPs ou ações"
        className="h-14 w-full border-b border-line bg-transparent px-5 text-base outline-none placeholder:text-ink-3 focus-visible:shadow-none focus-visible:outline-none"
      />
      <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        <Command.Empty className="px-4 py-10 text-center text-sm text-ink-2">Nada encontrado com esse termo.</Command.Empty>
        <Command.Group heading="Ações" className={groupClass}>
          <Command.Item className={itemClass} onSelect={run(() => set({ cartOpen: true }))}>
            <ShoppingBag className="size-4" /> Abrir carrinho
          </Command.Item>
          <Command.Item className={itemClass} onSelect={run(toggleTheme)}>
            <Moon className="size-4" /> Mudar para o tema {theme === "dark" ? "claro" : "escuro"}
          </Command.Item>
          <Command.Item className={itemClass} onSelect={run(() => router.push("/montar"))}>
            <Sparkles className="size-4" /> Ir para o assistente
          </Command.Item>
          <Command.Item className={itemClass} onSelect={run(() => set({ shortcutsOpen: true }))}>
            <Keyboard className="size-4" /> Ver atalhos de teclado
          </Command.Item>
          <Command.Item
            className={itemClass}
            onSelect={run(() => {
              useKit.getState().reset();
              router.push("/montar");
              toast("Tudo limpo. Vamos montar um kit novo.");
            })}
          >
            <RotateCcw className="size-4" /> Montar outro kit do zero
          </Command.Item>
        </Command.Group>
        {groups.map(({ kind, items }) => (
          <Command.Group key={kind} heading={KIND_LABEL[kind].many} className={groupClass}>
            {items.map((it) => {
              const inCart = cart[kind].includes(it.id);
              return (
                <Command.Item
                  key={it.id}
                  value={`${KIND_LABEL[kind].one} ${it.name} ${it.category} ${it.id}`}
                  className={itemClass}
                  onSelect={toggleItem(kind, it.id, it.name)}
                >
                  <span className="grid size-5 place-items-center rounded-md border border-line-strong">
                    {inCart ? <Check className="size-3.5" /> : <Plus className="size-3.5 text-ink-3" />}
                  </span>
                  <span className="flex-1 truncate text-ink">{it.name}</span>
                  <span className="hidden text-xs text-ink-3 sm:block">{inCart ? "No kit" : it.category}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
