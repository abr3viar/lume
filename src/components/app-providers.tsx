"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-toggle";
import { useKit, useUi } from "@/store/kit-store";

// Carregados sob demanda: mantêm o catálogo fora do JS inicial da landing.
const CartDrawer = dynamic(() => import("@/components/cart-drawer").then((m) => m.CartDrawer), { ssr: false });
const CommandPalette = dynamic(() => import("@/components/command-palette").then((m) => m.CommandPalette), { ssr: false });
const ShortcutsDialog = dynamic(() => import("@/components/shortcuts-dialog").then((m) => m.ShortcutsDialog), { ssr: false });

function LazyOverlays() {
  const { cartOpen, paletteOpen, shortcutsOpen } = useUi();
  const [cart, palette, shortcuts] = [useOnce(cartOpen), useOnce(paletteOpen), useOnce(shortcutsOpen)];
  return (
    <>
      {cart && <CartDrawer />}
      {palette && <CommandPalette />}
      {shortcuts && <ShortcutsDialog />}
    </>
  );
}

/** Fica true para sempre depois da primeira vez que `v` vira true (mantém a animação de saída). */
function useOnce(v: boolean) {
  const [seen, setSeen] = useState(v);
  if (v && !seen) setSeen(true);
  return seen;
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    void Promise.resolve(useKit.persist.rehydrate()).then(() => useUi.getState().set({ hydrated: true }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useUi.getState().set({ paletteOpen: !useUi.getState().paletteOpen });
        return;
      }
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        useUi.getState().set({ cartOpen: !useUi.getState().cartOpen });
        return;
      }
      if (!isTyping(e) && e.key === "?" && !mod) {
        e.preventDefault();
        useUi.getState().set({ shortcutsOpen: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {children}
      <LazyOverlays />
      <Toaster
        theme={theme}
        position="bottom-center"
        toastOptions={{
          className: "!rounded-2xl !border-line !bg-surface !text-ink !shadow-lift !font-sans",
        }}
      />
    </>
  );
}
