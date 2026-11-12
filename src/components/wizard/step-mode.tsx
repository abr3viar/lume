"use client";

import { FolderGit2, Sprout } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/schemas";
import { useKit } from "@/store/kit-store";
import { Button } from "@/components/ui/button";
import { StepFooter, StepHeader } from "./step-header";
import { useStepNext } from "./step-actions";

const OPTIONS: { value: Mode; title: string; text: string; points: string[]; Icon: typeof Sprout }[] = [
  {
    value: "existente",
    title: "Já tenho um projeto",
    text: "Você já tem código. O kit será adaptado ao que existe.",
    points: [
      "O Claude analisa seu código antes de agir",
      "Agentes e skills ajustados aos seus comandos",
      "Plano de execução na ordem certa",
    ],
    Icon: FolderGit2,
  },
  {
    value: "zero",
    title: "Vou começar do zero",
    text: "Você quer construir o SaaS junto com o Claude Code.",
    points: [
      "Modo Descoberta: entrevista antes de construir",
      "Briefing pronto para preencher junto",
      "Agentes de fundação: arquitetura, MVP, dados",
    ],
    Icon: Sprout,
  },
];

export function StepMode() {
  const mode = useKit((s) => s.mode);
  const setMode = useKit((s) => s.setMode);
  const setStep = useKit((s) => s.setStep);

  const choose = (m: Mode) => {
    setMode(m);
    setStep(2);
  };
  useStepNext(mode ? () => setStep(2) : null);

  return (
    <div className="wrap py-12 lg:py-16">
      <StepHeader title="Como você vai usar o kit?">
        Essa escolha muda o que vai no pacote e como o Claude começa a trabalhar. Dá para trocar depois.
      </StepHeader>
      <RadioGroup.Root
        value={mode ?? ""}
        onValueChange={(v) => setMode(v as Mode)}
        aria-label="Modo de uso"
        className="grid gap-4 md:grid-cols-2"
      >
        {OPTIONS.map(({ value, title, text, points, Icon }) => {
          const selected = mode === value;
          return (
            <RadioGroup.Item
              key={value}
              value={value}
              // Setas do teclado disparam um click programático (detail 0): só seleciona.
              onClick={(e) => {
                if (e.detail > 0) choose(value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") choose(value);
              }}
              className={cn(
                "group relative flex flex-col rounded-[1.75rem] border p-7 text-left transition-[border-color,box-shadow,transform] duration-300 ease-out-soft sm:p-9",
                "hover:-translate-y-0.5 hover:shadow-lift focus-visible:rounded-[1.75rem]",
                selected ? "border-ink bg-surface shadow-lift [[data-theme=dark]_&]:border-brand" : "border-line bg-bg",
              )}
            >
              <span
                className={cn(
                  "grid size-14 place-items-center rounded-2xl border transition-colors duration-300",
                  selected ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-ink group-hover:border-line-strong",
                )}
              >
                <Icon className="size-6" />
              </span>
              <span className="mt-8 font-display text-3xl font-semibold tracking-[-0.02em]">{title}</span>
              <span className="mt-2 text-ink-2">{text}</span>
              <ul className="mt-6 space-y-2 text-sm text-ink-2">
                {points.map((p) => (
                  <li key={p} className="flex gap-2.5">
                    <span className="mt-[0.55rem] block size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <span
                aria-hidden
                className={cn(
                  "absolute right-7 top-7 grid size-6 place-items-center rounded-full border-2 transition-colors",
                  selected ? "border-ink bg-ink [[data-theme=dark]_&]:border-brand [[data-theme=dark]_&]:bg-brand" : "border-line-strong",
                )}
              >
                <RadioGroup.Indicator className="block size-2 rounded-full bg-bg [[data-theme=dark]_&]:bg-brand-ink" />
              </span>
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
      <StepFooter>
        <p className="text-sm text-ink-3">Clique em uma opção ou use as setas e Enter.</p>
        <Button size="lg" disabled={!mode} onClick={() => setStep(2)}>
          Continuar
        </Button>
      </StepFooter>
    </div>
  );
}
