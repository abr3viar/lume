"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Spark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import type { ItemKind } from "@/data/catalog/schema";
import { itemMeta, KIND_LABEL, RISK_META } from "@/lib/item-meta";
import { cartCount, useKit, useUi } from "@/store/kit-store";

const KINDS: ItemKind[] = ["agent", "skill", "mcp"];

export function CartDrawer() {
  const open = useUi((s) => s.cartOpen);
  const set = useUi((s) => s.set);
  const cart = useKit((s) => s.cart);
  const remove = useKit((s) => s.remove);
  const setStep = useKit((s) => s.setStep);
  const mode = useKit((s) => s.mode);
  const router = useRouter();
  const total = cartCount(cart);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => set({ cartOpen: o })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px] [[data-theme=dark]_&]:bg-black/60" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-bg shadow-lift outline-none data-[state=open]:animate-[sheet-in_320ms_var(--ease-out-soft)]"
          aria-describedby={undefined}
        >
          <header className="flex items-center justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl font-semibold tracking-tight">Seu kit</Dialog.Title>
              <p className="text-sm text-ink-2">
                {total === 0 ? "Nada por aqui ainda" : `${total} ${total === 1 ? "item" : "itens"} selecionados`}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fechar carrinho">
                <X />
              </Button>
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {total === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="relative grid size-20 place-items-center rounded-full border border-dashed border-line-strong">
                  <Spark className="size-9 text-ink-3 opacity-60 grayscale" />
                </div>
                <p className="max-w-60 text-pretty text-ink-2">{brand.copy.emptyCart}</p>
              </div>
            ) : (
              KINDS.map((kind) =>
                cart[kind].length ? (
                  <section key={kind} className="mb-6">
                    <h3 className="mb-2 flex items-baseline justify-between text-sm font-semibold">
                      {KIND_LABEL[kind].many}
                      <span className="tabular-nums font-normal text-ink-3">{cart[kind].length}</span>
                    </h3>
                    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                      <AnimatePresence initial={false}>
                        {cart[kind].map((id) => {
                          const meta = itemMeta(kind, id);
                          if (!meta) return null;
                          return (
                            <motion.li
                              key={id}
                              layout
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{meta.name}</p>
                                  <p className="truncate text-xs text-ink-3">
                                    {meta.mcp ? RISK_META[meta.mcp.riskLevel].label : meta.category}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Remover ${meta.name}`}
                                  onClick={() => remove(kind, id)}
                                >
                                  <X />
                                </Button>
                              </div>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </section>
                ) : null,
              )
            )}
          </div>

          <footer className="border-t border-line px-6 py-4">
            <Button
              size="lg"
              className="w-full"
              disabled={total === 0 || !mode}
              onClick={() => {
                set({ cartOpen: false });
                setStep(4);
                router.push("/montar");
              }}
            >
              Revisar e gerar
            </Button>
            {!mode && total > 0 && (
              <p className="mt-2 text-center text-xs text-ink-3">Escolha o modo de uso no assistente para continuar.</p>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
