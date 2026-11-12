import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Faísca do Lume: uma chama estilizada em amarelo com núcleo na cor do texto.
 * O núcleo usa currentColor, então a mesma marca funciona no claro (preto) e no escuro (branco).
 */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("shrink-0", className)}>
      <path
        d="M16.6 2.5c.6 4.4 3.1 6.6 5.6 9 2.6 2.5 4.8 5.3 4.8 9.3C27 26.4 22.3 30 16 30S5 26.4 5 20.8c0-3.5 1.6-6 3.7-8.1.3 2.6 1.3 4.3 3.1 5.3-.6-5.8 1.4-10.6 4.8-15.5Z"
        fill="var(--brand)"
      />
      <path
        d="M16.3 15.2c.4 2.4 1.8 3.5 3 4.8 1.1 1.2 1.9 2.5 1.9 4.1 0 2.6-2.2 4.4-5.2 4.4s-5.2-1.8-5.2-4.4c0-2.6 2.1-4.6 3.6-6.4.2 1.3.9 2.1 1.8 2.5-.3-1.9-.3-3.3.1-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-ink", className)}>
      <Spark className="size-6 -translate-y-px" />
      <span className="font-display text-[1.35rem] font-bold leading-none tracking-[-0.04em] [font-stretch:92%]">
        {brand.name}
      </span>
    </span>
  );
}
