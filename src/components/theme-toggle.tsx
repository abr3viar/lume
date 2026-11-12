"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const getTheme = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("lume-theme", t);
    } catch {}
  }, []);
  const toggle = useCallback(() => setTheme(getTheme() === "dark" ? "light" : "dark"), [setTheme]);
  return { theme, setTheme, toggle };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "claro" : "escuro";
  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={`Mudar para o tema ${next}`} title={`Tema ${next}`}>
      <Sun className="hidden [[data-theme=dark]_&]:block" />
      <Moon className="block [[data-theme=dark]_&]:hidden" />
    </Button>
  );
}
