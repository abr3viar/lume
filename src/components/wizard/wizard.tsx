"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useKit, useUi, type Step } from "@/store/kit-store";
import { stepActions } from "./step-actions";
import { StepAbout } from "./step-about";
import { StepGenerate } from "./step-generate";
import { StepMode } from "./step-mode";
import { StepRecs } from "./step-recs";
import { StepReview } from "./step-review";

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Modo" },
  { n: 2, label: "Sobre o SaaS" },
  { n: 3, label: "Recomendações" },
  { n: 4, label: "Revisão" },
  { n: 5, label: "Geração" },
];

function Progress() {
  const step = useKit((s) => s.step);
  const maxStep = useKit((s) => s.maxStep);
  const setStep = useKit((s) => s.setStep);
  const mode = useKit((s) => s.mode);
  const generating = step === 5;
  const pct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <nav aria-label="Etapas" className="sticky top-16 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-xl">
      <div className="wrap py-3">
        <div className="relative">
          <div className="absolute left-0 right-0 top-[13px] h-px bg-line" aria-hidden />
          <div
            className="absolute left-0 top-[13px] h-px bg-ink transition-[width] duration-500 ease-out-soft [[data-theme=dark]_&]:bg-brand"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
          <ol className="relative flex justify-between">
            {STEPS.map((s) => {
              const done = s.n < step;
              const current = s.n === step;
              const reachable = s.n <= maxStep && !generating && (s.n === 1 || !!mode) && s.n !== 5;
              return (
                <li key={s.n} className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!reachable || current}
                    onClick={() => setStep(s.n)}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Etapa ${s.n}: ${s.label}${done ? ", concluída" : ""}`}
                    className={cn(
                      "grid size-[27px] place-items-center rounded-full border text-xs font-semibold tabular-nums transition-colors duration-300",
                      current && "border-brand bg-brand text-brand-ink",
                      done && "border-ink bg-ink text-bg [[data-theme=dark]_&]:border-ink-2 [[data-theme=dark]_&]:bg-surface-2 [[data-theme=dark]_&]:text-ink",
                      !current && !done && "border-line-strong bg-bg text-ink-3",
                      reachable && !current && "hover:border-ink",
                      "disabled:cursor-default",
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : s.n}
                  </button>
                  <span
                    className={cn(
                      "hidden text-xs sm:block",
                      current ? "font-medium text-ink" : "text-ink-3",
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-1 text-center text-xs font-medium sm:hidden" aria-hidden>
          {STEPS[step - 1].label}
        </p>
      </div>
    </nav>
  );
}

function WizardSkeleton() {
  return (
    <div className="wrap py-16" aria-busy="true" aria-label="Carregando o assistente">
      <div className="skeleton h-10 w-72 rounded-xl" />
      <div className="skeleton mt-4 h-5 w-96 max-w-full rounded-lg" />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="skeleton h-56 rounded-3xl" />
        <div className="skeleton h-56 rounded-3xl" />
      </div>
    </div>
  );
}

export function Wizard() {
  const hydrated = useUi((s) => s.hydrated);
  const step = useKit((s) => s.step);
  const setStep = useKit((s) => s.setStep);
  const reduce = useReducedMotion();
  const headingRef = useRef<HTMLDivElement>(null);
  const prev = useRef(step);

  // Leva o foco para o topo da etapa nova (leitores de tela e teclado).
  useEffect(() => {
    if (!hydrated) return;
    if (prev.current !== step) {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      headingRef.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    }
    prev.current = step;
  }, [step, hydrated, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        stepActions.next?.();
      } else if (e.altKey && e.key === "ArrowLeft") {
        const s = useKit.getState().step;
        if (s > 1 && s < 5) {
          e.preventDefault();
          setStep((s - 1) as Step);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setStep]);

  if (!hydrated) return <WizardSkeleton />;

  return (
    <>
      <Progress />
      <div ref={headingRef}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 1 && <StepMode />}
            {step === 2 && <StepAbout />}
            {step === 3 && <StepRecs />}
            {step === 4 && <StepReview />}
            {step === 5 && <StepGenerate />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
