"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Circle, Copy, Download, Info, LoaderCircle, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Spark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { extractPromptBlock, KitGeneration, type GenerateResult, type GenProgress } from "@/lib/client/generate";
import { saasInfoSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { formToInput, useKit } from "@/store/kit-store";
import { ModeBadge } from "./mode-badge";
import { StepHeader } from "./step-header";

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function TaskIcon({ state }: { state: GenProgress["tasks"][number]["state"] }) {
  if (state === "ok") return <Check className="size-4 text-ok" strokeWidth={3} aria-label="Concluído" />;
  if (state === "base") return <Info className="size-4 text-warn-ink" aria-label="Usou o modelo base" />;
  if (state === "trabalhando")
    return <LoaderCircle className="size-4 animate-spin text-ink motion-reduce:animate-none" aria-label="Em andamento" />;
  return <Circle className="size-3.5 text-line-strong" aria-label="Na fila" />;
}

function Success({ result, onReset, onRetry }: { result: GenerateResult; onReset: () => void; onRetry: () => void }) {
  const reduce = useReducedMotion();
  const mode = useKit((s) => s.mode);
  const url = useMemo(() => URL.createObjectURL(result.zip), [result.zip]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(extractPromptBlock(result.activationPrompt));
      toast.success("Prompt de ativação copiado");
    } catch {
      toast.error("Não deu para copiar. Abra o PROMPT-DE-ATIVACAO.md no zip.");
    }
  };

  const steps = [
    `Descompacte ${result.fileName}.`,
    mode === "zero"
      ? "Crie uma pasta vazia para o projeto e copie todo o conteúdo para ela."
      : "Copie a pasta .claude, o CLAUDE.md e os demais arquivos para a raiz do seu projeto.",
    "Se houver MCPs com chave, preencha o .env seguindo o LEIA-ME.",
    "Abra o terminal na pasta, rode claude e cole o prompt de ativação.",
  ];

  return (
    <div className="wrap py-12 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <motion.div
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mb-8 grid size-20 place-items-center rounded-[1.6rem] bg-ink text-bg [[data-theme=dark]_&]:bg-surface-2 [[data-theme=dark]_&]:text-ink"
          >
            <Spark className="size-11" />
          </motion.div>
          <StepHeader title={brand.copy.success} className="mb-8">
            {result.files.length} arquivos prontos para a pasta do seu projeto.
          </StepHeader>
          <ModeBadge compact className="mb-6 max-w-xl" />
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={url} download={result.fileName}>
                <Download /> Baixar {result.fileName}
              </a>
            </Button>
            <Button size="lg" variant="outline" onClick={copy}>
              <Copy /> Copiar prompt de ativação
            </Button>
          </div>
          {result.fallbacks.length > 0 && (
            <div className="mt-6 max-w-xl rounded-2xl bg-warn-bg p-4 text-sm text-warn-ink" role="status" data-testid="fallbacks">
              <p className="flex gap-2">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <strong className="font-semibold">{result.fallbacks.join(", ")}</strong>{" "}
                  {result.fallbacks.length === 1 ? "ficou" : "ficaram"} com o modelo base, que já funciona. O LEIA-ME registra
                  isso.
                </span>
              </p>
              {result.fallbackKeys.length > 0 && (
                <Button variant="outline" size="sm" className="mt-3 bg-bg" onClick={onRetry}>
                  <RefreshCw /> Tentar de novo só {result.fallbackKeys.length === 1 ? "este item" : `estes ${result.fallbackKeys.length} itens`}
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-line bg-surface p-7">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Próximos passos</h2>
          <ol className="mt-5 grid gap-4">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-sm font-semibold tabular-nums">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-pretty text-ink-2">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-ink-3">O LEIA-ME.md dentro do zip tem o passo a passo completo.</p>
          <Button variant="ghost" className="mt-6 -ml-3" onClick={onReset}>
            <RotateCcw /> Montar outro kit
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StepGenerate() {
  const mode = useKit((s) => s.mode)!;
  const form = useKit((s) => s.form);
  const cart = useKit((s) => s.cart);
  const setStep = useKit((s) => s.setStep);
  const reset = useKit((s) => s.reset);
  const ai = useKit((s) => s.recsSource) !== "local";
  const [progress, setProgress] = useState<GenProgress | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ctrl = useRef<AbortController | null>(null);
  const gen = useRef<KitGeneration | null>(null);

  useEffect(() => {
    const parsed = saasInfoSchema.safeParse(formToInput(form));
    if (!parsed.success) {
      setStep(2);
      return;
    }
    const c = new AbortController();
    ctrl.current = c;
    const g = new KitGeneration(
      { mode, saas: parsed.data, ids: { agents: cart.agent, skills: cart.skill, mcps: cart.mcp }, ai },
      (p) => !c.signal.aborted && setProgress(p),
    );
    gen.current = g;
    g.run(c.signal)
      .then(() => g.pack())
      .then((r) => !c.signal.aborted && setResult(r))
      .catch(() => !c.signal.aborted && setFailed(true));
    return () => c.abort();
    // Gera uma vez por entrada na etapa (ou por nova tentativa).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  /** Tenta de novo só os itens que ficaram com o modelo base. */
  const retryFailed = () => {
    const g = gen.current;
    if (!g) return;
    const c = new AbortController();
    ctrl.current = c;
    setResult(null);
    g.retryFailed(c.signal)
      .then(() => g.pack())
      .then((r) => {
        if (c.signal.aborted) return;
        setResult(r);
        toast.success(r.fallbacks.length ? `${r.fallbacks.length} ainda com o modelo base` : "Todos os itens personalizados");
      })
      .catch(() => !c.signal.aborted && setFailed(true));
  };

  /** Baixa o que já está pronto, sem esperar o fim: o resto vai com o modelo base. */
  const downloadPartial = async () => {
    const g = gen.current;
    if (!g) return;
    const r = await g.pack();
    downloadBlob(r.zip, r.fileName);
    const pending = r.fallbacks.length;
    toast.success(pending ? `Zip parcial baixado: ${pending} ${pending === 1 ? "item ainda está" : "itens ainda estão"} com o modelo base` : "Zip baixado");
  };

  if (result) {
    return (
      <Success
        result={result}
        onRetry={retryFailed}
        onReset={() => {
          reset();
          toast("Tudo limpo. Vamos montar um kit novo.");
        }}
      />
    );
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;
  const working = progress?.tasks.filter((t) => t.state === "trabalhando") ?? [];
  const current = working[0];
  const position = progress ? Math.min(progress.done + 1, progress.total) : 0;

  return (
    <div className="wrap py-12 lg:py-16">
      <StepHeader title={failed ? "Faltou luz por aqui" : "Acendendo o seu kit"}>
        {failed
          ? "Não conseguimos montar o zip. Seus itens continuam no carrinho."
          : ai
            ? "Cada item é personalizado separadamente. Se algum não der certo, ele entra com o modelo base."
            : "Montando agentes, skills e arquivos de contexto com o seu SaaS. O Claude Code termina de adaptar tudo ao seu projeto pelo prompt de ativação."}
      </StepHeader>

      {!failed && <ModeBadge className="-mt-4 mb-8 max-w-3xl" />}

      {failed ? (
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setFailed(false);
              setProgress(null);
              setAttempt((a) => a + 1);
            }}
          >
            <RefreshCw /> Tentar de novo
          </Button>
          <Button variant="ghost" onClick={() => setStep(4)}>
            Voltar para a revisão
          </Button>
        </div>
      ) : (
        <div className="max-w-3xl">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-pretty font-medium" aria-live="polite">
              {current ? `${current.label}… ${position} de ${progress!.total}` : progress ? "Preparando…" : "Começando…"}
            </p>
            <span className="tabular-nums text-sm text-ink-2">{pct}%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Progresso da geração"
            aria-valuemin={0}
            aria-valuemax={progress?.total ?? 1}
            aria-valuenow={progress?.done ?? 0}
          >
            <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out-soft" style={{ width: `${pct}%` }} />
          </div>

          <ul className="mt-8 grid gap-1">
            {progress?.tasks.map((t) => (
              <li
                key={t.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  t.state === "trabalhando" ? "bg-surface text-ink" : t.state === "pendente" ? "text-ink-3" : "text-ink-2",
                )}
              >
                <span className="grid size-5 place-items-center">
                  <TaskIcon state={t.state} />
                </span>
                <span className="flex-1">{t.label}</span>
                {t.state === "base" && <span className="text-xs text-warn-ink">modelo base</span>}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {ai && (
              <Button variant="outline" disabled={!progress || progress.done === 0} onClick={downloadPartial}>
                <Download /> Baixar o que já está pronto
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                ctrl.current?.abort();
                setStep(4);
              }}
            >
              Cancelar
            </Button>
          </div>
          {ai && progress && (
            <p className="mt-3 text-xs text-ink-3">
              {progress.concurrency} {progress.concurrency === 1 ? "item por vez" : "itens ao mesmo tempo"}. Itens que ainda não terminaram vão com o modelo base no download parcial.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
