"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Kbd, useModKey } from "@/components/shortcuts-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { cartCount, useKit, useUi } from "@/store/kit-store";

export function CartButton() {
  const count = useKit((s) => cartCount(s.cart));
  const hydrated = useUi((s) => s.hydrated);
  const pulse = useUi((s) => s.cartPulse);
  const set = useUi((s) => s.set);
  const reduce = useReducedMotion();
  const shown = hydrated ? count : 0;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => set({ cartOpen: true })}
      aria-label={`Abrir carrinho, ${shown} ${shown === 1 ? "item" : "itens"}`}
      className="relative gap-2 pl-2.5 pr-3"
      data-cart-target
    >
      <motion.span
        key={pulse}
        initial={reduce || pulse === 0 ? false : { scale: 1.35, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 16 }}
        className="grid place-items-center"
      >
        <ShoppingBag />
      </motion.span>
      <span className="relative inline-flex h-5 min-w-5 items-center justify-center overflow-hidden tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={shown}
            initial={reduce ? false : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: -10, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "rounded-full px-1.5 text-xs font-semibold",
              shown > 0 ? "bg-brand text-brand-ink" : "text-ink-3",
            )}
          >
            {shown}
          </motion.span>
        </AnimatePresence>
      </span>
    </Button>
  );
}

export function SiteHeader({ landing = false }: { landing?: boolean }) {
  const set = useUi((s) => s.set);
  const mod = useModKey();
  return (
    <header className="sticky top-3 z-40 px-3 sm:top-4">
      <div className="mx-auto flex h-14 w-full max-w-[72rem] items-center gap-2 rounded-full border border-line/80 bg-bg/75 pl-4 pr-2 shadow-[0_16px_40px_-24px_rgb(0_0_0/0.35),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60 sm:gap-3 sm:pl-5">
        <Link href="/" aria-label={`${brand.name}, página inicial`} className="mr-auto rounded-md">
          <Logo />
        </Link>
        {landing && (
          <nav aria-label="Seções" className="mr-2 hidden items-center gap-1 text-sm md:flex">
            <a href="#como-funciona" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
              Como funciona
            </a>
            <a href="#perguntas" className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
              Perguntas
            </a>
          </nav>
        )}
        <button
          type="button"
          onClick={() => set({ paletteOpen: true })}
          className="hidden h-8 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 sm:flex"
        >
          <Search className="size-3.5" />
          Buscar
          <span className="ml-3 flex gap-0.5">
            <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <Button variant="ghost" size="icon-sm" className="sm:hidden" aria-label="Buscar" onClick={() => set({ paletteOpen: true })}>
          <Search />
        </Button>
        <ThemeToggle />
        <CartButton />
        {landing && (
          <Button asChild size="sm" variant="ink" className="sheen hidden h-9 px-4 md:inline-flex">
            <Link href="/montar">{brand.copy.heroCta}</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
