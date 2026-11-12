"use client";

import { AnimatePresence } from "framer-motion";
import { Package, RefreshCw, Search, Sparkles } from "lucide-react";
import { Tabs } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Spark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { presets, type ItemKind } from "@/data/catalog";
import { fetchRecommendations, RecommendError } from "@/lib/client/recommend";
import { itemMeta, KIND_LABEL } from "@/lib/item-meta";
import { adaptPreset } from "@/lib/presets-adapt";
import { isTaskMode } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { cartCount, cartSummary, formToInput, recsKeyFor, useKit, useUi } from "@/store/kit-store";
import { Chip } from "./fields";
import { CardSkeleton, ItemCard } from "./item-card";
import { ModeBadge } from "./mode-badge";
import { useStepNext } from "./step-actions";
import { StepFooter, StepHeader } from "./step-header";

const KINDS: ItemKind[] = ["agent", "skill", "mcp"];

function useRecommendations() {
  const mode = useKit((s) => s.mode)!;
  const form = useKit((s) => s.form);
  const setRecs = useKit((s) => s.setRecs);
  const setUi = useUi((s) => s.set);
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(
    async (kinds: ItemKind[], more: boolean) => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      const key = recsKeyFor(mode, form);
      if (!more) setRecs(() => ({ agent: [], skill: [], mcp: [] }), null);
      const status = { ...useUi.getState().recStatus };
      kinds.forEach((k) => (status[k] = "loading"));
      setUi({ recStatus: status, recError: null });
      const current = useKit.getState().recs;
      try {
        await fetchRecommendations(
          {
            mode,
            saas: formToInput(form),
            kinds,
            more,
            excludeIds: more
              ? { agent: current.agent.map((r) => r.id), skill: current.skill.map((r) => r.id), mcp: current.mcp.map((r) => r.id) }
              : { agent: [], skill: [], mcp: [] },
          },
          {
            signal: c.signal,
            onMeta: (source, provider) => useKit.setState({ recsSource: source, aiProvider: provider }),
            onItem: (item) =>
              setRecs((r) =>
                r[item.kind].some((x) => x.id === item.id) ? r : { ...r, [item.kind]: [...r[item.kind], item] },
              ),
          },
        );
        if (!more) setRecs((r) => r, key);
        const done = { ...useUi.getState().recStatus };
        kinds.forEach((k) => (done[k] = "done"));
        setUi({ recStatus: done });
      } catch (err) {
        if (c.signal.aborted) return;
        const message = err instanceof RecommendError ? err.message : brand.copy.genericError;
        const failed = { ...useUi.getState().recStatus };
        kinds.forEach((k) => (failed[k] = "error"));
        setUi({ recStatus: failed, recError: message });
        if (more) toast.error(message);
      }
    },
    [mode, form, setRecs, setUi],
  );

  useEffect(() => {
    const st = useKit.getState();
    const key = recsKeyFor(st.mode, st.form);
    const empty = KINDS.every((k) => st.recs[k].length === 0);
    if (st.recsKey !== key || empty) void run(KINDS, false);
    else setUi({ recStatus: { agent: "done", skill: "done", mcp: "done" } });
    return () => ctrl.current?.abort();
    // Executa só ao entrar na etapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return run;
}

function Presets() {
  const mode = useKit((s) => s.mode);
  const model = useKit((s) => s.form.model);
  const recs = useKit((s) => s.recs);
  const addMany = useKit((s) => s.addMany);
  const recommended = {
    agent: recs.agent.map((r) => r.id),
    skill: recs.skill.map((r) => r.id),
    mcp: recs.mcp.map((r) => r.id),
  };
  return (
    <section aria-labelledby="presets-title" className="mb-12">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="presets-title" className="font-display text-2xl font-semibold tracking-tight">
          Kits prontos
        </h2>
        <p className="hidden text-sm text-ink-3 sm:block">Um clique adiciona o conjunto, ajustado ao seu SaaS.</p>
      </div>
      <div className="-mx-[clamp(1.25rem,4vw,2.5rem)] flex snap-x gap-3 overflow-x-auto px-[clamp(1.25rem,4vw,2.5rem)] pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {presets
          .filter((p) => !p.modes || (mode && p.modes.includes(mode)))
          .sort((a, b) => Number(!!b.modes) - Number(!!a.modes))
          .map((p) => {
          const a = adaptPreset(p, { model, mode, recommended });
          return (
            <article
              key={p.id}
              className="flex w-72 shrink-0 snap-start flex-col rounded-3xl border border-line bg-surface p-5 lg:w-auto"
            >
              <Package className="size-5 text-ink" aria-hidden />
              <h3 className="mt-3 font-semibold">{p.name}</h3>
              <p className="mt-1 flex-1 text-pretty text-sm text-ink-2">{p.description}</p>
              <p className="mt-3 text-xs text-ink-3">
                {a.total} itens{a.alsoSuggested ? `, ${a.alsoSuggested} também sugeridos pela IA` : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  const n = addMany({ agent: a.agent, skill: a.skill, mcp: a.mcp });
                  if (n) useUi.setState((s) => ({ cartPulse: s.cartPulse + 1 }));
                  const notes = [
                    a.dropped.length ? `deixamos de fora ${a.dropped.join(", ")} (outro modelo de negócio)` : "",
                    a.added.length ? `incluímos ${a.added.join(" e ")} para quem começa do zero` : "",
                  ].filter(Boolean);
                  toast.success(n ? `${p.name}: ${n} ${n === 1 ? "item novo" : "itens novos"} no kit` : "Esses itens já estavam no seu kit", {
                    description: notes.length ? `Ajustes: ${notes.join("; ")}.` : undefined,
                  });
                }}
              >
                Adicionar kit
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Atalho para começar enxuto: adiciona só o que foi marcado como essencial. */
function EssentialsBar() {
  const recs = useKit((s) => s.recs);
  const cart = useKit((s) => s.cart);
  const addMany = useKit((s) => s.addMany);
  const essentials = {
    agent: recs.agent.filter((r) => r.impact === "alto").map((r) => r.id),
    skill: recs.skill.filter((r) => r.impact === "alto").map((r) => r.id),
    mcp: recs.mcp.filter((r) => r.impact === "alto").map((r) => r.id),
  };
  const total = essentials.agent.length + essentials.skill.length + essentials.mcp.length;
  const missing = KINDS.reduce((n, k) => n + essentials[k].filter((id) => !cart[k].includes(id)).length, 0);
  if (total === 0) return null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-pretty text-sm text-ink-2">
        <span className="font-medium text-ink">Comece enxuto.</span> {cartSummary(essentials)} foram marcados como
        essenciais para o seu caso; o resto é opcional.
      </p>
      <Button
        variant={missing ? "primary" : "outline"}
        size="sm"
        disabled={missing === 0}
        onClick={() => {
          const n = addMany(essentials);
          if (n) useUi.setState((s) => ({ cartPulse: s.cartPulse + 1 }));
          toast.success(`${n} ${n === 1 ? "item essencial adicionado" : "itens essenciais adicionados"} ao kit`);
        }}
      >
        {missing ? "Adicionar essenciais" : "Essenciais no kit"}
      </Button>
    </div>
  );
}

function RecsPanel({ kind, run }: { kind: ItemKind; run: (k: ItemKind[], more: boolean) => Promise<void> }) {
  const recs = useKit((s) => s.recs[kind]);
  const status = useUi((s) => s.recStatus[kind]);
  const error = useUi((s) => s.recError);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(recs.map((r) => itemMeta(kind, r.id)?.category).filter(Boolean) as string[])],
    [recs, kind],
  );
  const filtered = recs.filter((r) => {
    const m = itemMeta(kind, r.id);
    if (!m) return false;
    if (category && m.category !== category) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [m.name, m.description, r.reason, m.category].some((t) => t.toLowerCase().includes(q));
  });
  const loading = status === "loading";

  if (status === "error" && recs.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center" role="alert">
        <Spark className="size-10 text-ink-3 opacity-70 grayscale" />
        <p className="mt-4 font-display text-2xl font-semibold tracking-tight">Faltou luz por aqui</p>
        <p className="mt-2 max-w-md text-pretty text-ink-2">{error ?? brand.copy.genericError}</p>
        <Button className="mt-6" onClick={() => run(KINDS, false)}>
          <RefreshCw /> Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div>
      {recs.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block sm:w-72">
            <span className="sr-only">Buscar nas sugestões</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nas sugestões"
              className="h-10 w-full rounded-full border border-line bg-bg pl-10 pr-4 text-sm outline-none placeholder:text-ink-3 hover:border-line-strong focus-visible:rounded-full [[data-theme=dark]_&]:bg-surface"
            />
          </label>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
              <Chip selected={category === null} onClick={() => setCategory(null)}>
                Todas
              </Chip>
              {categories.map((c) => (
                <Chip key={c} selected={category === c} onClick={() => setCategory(category === c ? null : c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite" aria-busy={loading}>
        <AnimatePresence initial={false}>
          {filtered.map((r, i) => (
            <ItemCard key={r.id} kind={kind} rec={r} index={i} />
          ))}
        </AnimatePresence>
        {loading &&
          Array.from({ length: recs.length === 0 ? 3 : 1 }).map((_, i) => <CardSkeleton key={`sk-${i}`} />)}
      </div>

      {!loading && recs.length > 0 && filtered.length === 0 && (
        <p className="py-10 text-center text-ink-2">Nenhuma sugestão combina com esse filtro.</p>
      )}

      {!loading && status === "done" && recs.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center">
          <Sparkles className="size-8 text-ink-3" aria-hidden />
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight">Nenhuma sugestão nesta aba</p>
          <p className="mt-2 max-w-md text-pretty text-ink-2">
            Use a busca (Ctrl+K) para adicionar qualquer item do catálogo, ou peça novas sugestões.
          </p>
        </div>
      )}

      {recs.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" disabled={loading} onClick={() => run([kind], true)}>
            <RefreshCw className={cn(loading && "animate-spin motion-reduce:animate-none")} />
            {loading ? "Buscando sugestões" : "Gerar mais sugestões"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function StepRecs() {
  const run = useRecommendations();
  const recs = useKit((s) => s.recs);
  const cart = useKit((s) => s.cart);
  const setStep = useKit((s) => s.setStep);
  const name = useKit((s) => s.form.name);
  const tab = useUi((s) => s.activeTab);
  const set = useUi((s) => s.set);
  const status = useUi((s) => s.recStatus);
  const source = useKit((s) => s.recsSource);
  const mode = useKit((s) => s.mode);
  const total = cartCount(cart);

  const next = () => {
    if (total === 0) {
      toast("Adicione pelo menos um item ao kit para continuar.");
      return;
    }
    setStep(4);
  };
  useStepNext(next);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = ["1", "2", "3"].indexOf(e.key);
      if (idx >= 0) set({ activeTab: KINDS[idx] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);

  return (
    <div className="wrap py-12 lg:py-16">
      <StepHeader title={`Sugestões para o ${name.trim() || "seu SaaS"}`}>
        {isTaskMode(mode)
          ? `${source === "local" ? "Escolhemos do catálogo o que mais combina com a tarefa que você descreveu." : "A IA escolheu do catálogo o que mais combina com a tarefa que você descreveu."} Para ${mode === "erro" ? "consertar um erro" : "uma mudança curta"}, menos é mais: fique só com o essencial.`
          : source === "local"
            ? "Escolhemos do catálogo o que mais combina com o nicho, o modelo, o estágio, o objetivo e a stack que você contou. Adicione ao kit o que fizer sentido."
            : "A IA escolheu do catálogo o que mais combina com o que você contou. Adicione ao kit o que fizer sentido."}
      </StepHeader>

      <ModeBadge className="-mt-4 mb-10 max-w-3xl" />

      <Presets />

      <EssentialsBar />

      <Tabs.Root value={tab} onValueChange={(v) => set({ activeTab: v as ItemKind })}>
        <Tabs.List aria-label="Tipos de item" className="mb-8 flex gap-1 border-b border-line">
          {KINDS.map((k, i) => (
            <Tabs.Trigger
              key={k}
              value={k}
              className="relative -mb-px flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm text-ink-2 transition-colors hover:text-ink data-[state=active]:border-ink data-[state=active]:font-medium data-[state=active]:text-ink focus-visible:rounded-md [[data-theme=dark]_&]:data-[state=active]:border-brand"
            >
              {KIND_LABEL[k].many}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums text-ink-2">
                {status[k] === "loading" && recs[k].length === 0 ? "…" : recs[k].length}
              </span>
              <span className="sr-only">(atalho {i + 1})</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {KINDS.map((k) => (
          <Tabs.Content key={k} value={k} className="outline-none">
            <RecsPanel kind={k} run={run} />
          </Tabs.Content>
        ))}
      </Tabs.Root>

      <StepFooter>
        <Button variant="ghost" onClick={() => setStep(2)}>
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-2 sm:block">
            {total === 0 ? "Nenhum item no kit" : cartSummary(cart)}
          </span>
          <Button size="lg" onClick={next} disabled={total === 0}>
            Revisar o kit
          </Button>
        </div>
      </StepFooter>
    </div>
  );
}
