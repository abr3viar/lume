import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Marca do Lume: um quadrado de cantos suaves na cor do texto com um ponto de luz amarelo
 * e um arco, como uma lâmpada acesa vista de cima. Geométrica e sem emoji.
 * O quadrado usa currentColor, então funciona no claro (preto) e no escuro (branco).
 */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <circle cx="16" cy="16" r="5.2" fill="var(--brand)" />
      <path d="M8.6 16a7.4 7.4 0 0 1 7.4-7.4" fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <Spark className="size-7" />
      <span className="font-display text-[1.3rem] font-semibold leading-none tracking-[-0.045em]">{brand.name}</span>
    </span>
  );
}
