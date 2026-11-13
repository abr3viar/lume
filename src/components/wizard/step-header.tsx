import { cn } from "@/lib/utils";

/** Cabeçalho padrão de cada etapa. O h1 recebe foco ao trocar de etapa. */
export function StepHeader({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("step-in mb-10 max-w-3xl", className)}>
      <h1
        tabIndex={-1}
        className="font-display text-4xl font-medium leading-[1.04] outline-none sm:text-[3.25rem]"
      >
        {title}
      </h1>
      {children && <div className="mt-4 text-pretty text-lg leading-relaxed text-ink-3">{children}</div>}
    </div>
  );
}

/** Barra de ações no fim de cada etapa (fixa no rodapé em telas pequenas). */
export function StepFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-[clamp(1.25rem,4vw,2.5rem)] mt-12 border-t border-line bg-bg/90 px-[clamp(1.25rem,4vw,2.5rem)] py-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">{children}</div>
    </div>
  );
}
