"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { KitTarget } from "@/lib/kit/targets";
import type { SiteReference } from "@/lib/reference/extract";
import type { ItemKind } from "@/data/catalog/schema";
import type { RecommendedItem } from "@/lib/ai/recommend-core";
import type { BusinessModel, Mode, ProjectKind, SaasInfoInput, SaasStage, TechLevel } from "@/lib/schemas";

export type Step = 1 | 2 | 3 | 4 | 5;

export type SaasForm = {
  kind: ProjectKind;
  name: string;
  description: string;
  niche: string;
  problem: string;
  model: BusinessModel | "";
  stage: SaasStage | "";
  stack: string[];
  goal: string;
  techLevel: TechLevel | "";
  task: string;
  details: string;
};

export const emptyForm: SaasForm = {
  kind: "saas",
  name: "",
  description: "",
  niche: "",
  problem: "",
  model: "",
  stage: "",
  stack: [],
  goal: "",
  techLevel: "",
  task: "",
  details: "",
};

export type Cart = { agent: string[]; skill: string[]; mcp: string[] };
export const emptyCart: Cart = { agent: [], skill: [], mcp: [] };
export type Recs = Record<ItemKind, RecommendedItem[]>;
const emptyRecs: Recs = { agent: [], skill: [], mcp: [] };

export function formToInput(form: SaasForm): SaasInfoInput {
  return {
    kind: form.kind ?? "saas",
    name: form.name,
    description: form.description,
    niche: form.niche,
    problem: form.problem,
    model: form.model || undefined,
    stage: form.stage || undefined,
    stack: form.stack,
    goal: form.goal,
    techLevel: form.techLevel || undefined,
    task: form.task,
    details: form.details,
  };
}

/** Chave que identifica o pedido de recomendação; muda quando os dados do SaaS mudam. */
export function recsKeyFor(mode: Mode | null, form: SaasForm) {
  return JSON.stringify([mode, form]);
}

type KitState = {
  step: Step;
  maxStep: Step;
  mode: Mode | null;
  form: SaasForm;
  recs: Recs;
  recsKey: string | null;
  /** De onde vieram as sugestões: IA (com chave) ou recomendador local (sem chave). */
  recsSource: "ia" | "local" | null;
  /** Quem gerou as sugestões: Claude Code local, API ou o recomendador do Lume. */
  aiProvider: "claude-code" | "api" | "local" | null;
  cart: Cart;
  /** Ferramenta de IA onde o kit vai rodar (Claude Code, Codex, Gemini CLI, Cursor, Grok ou outra). */
  target: KitTarget;
  setTarget: (t: KitTarget) => void;
  /** Sites de referência visual já extraídos (no máximo 3). */
  refs: SiteReference[];
  setRefs: (refs: SiteReference[]) => void;
  setStep: (s: Step) => void;
  setMode: (m: Mode) => void;
  setForm: (patch: Partial<SaasForm>) => void;
  setRecs: (updater: (r: Recs) => Recs, key?: string | null) => void;
  toggle: (kind: ItemKind, id: string) => boolean;
  add: (kind: ItemKind, id: string) => void;
  addMany: (items: Partial<Cart>) => number;
  remove: (kind: ItemKind, id: string) => void;
  clearCart: () => void;
  reset: () => void;
};

export const useKit = create<KitState>()(
  persist(
    (set, get) => ({
      step: 1,
      maxStep: 1,
      mode: null,
      form: emptyForm,
      recs: emptyRecs,
      recsKey: null,
      recsSource: null,
      aiProvider: null,
      cart: emptyCart,
      target: "claude-code",
      setTarget: (t) => set({ target: t }),
      refs: [],
      setRefs: (refs) => set({ refs: refs.slice(0, 3) }),
      setStep: (s) => set((st) => ({ step: s, maxStep: (Math.max(st.maxStep, s) as Step) })),
      setMode: (m) => set({ mode: m }),
      setForm: (patch) => set((st) => ({ form: { ...st.form, ...patch } })),
      setRecs: (updater, key) => set((st) => ({ recs: updater(st.recs), ...(key !== undefined ? { recsKey: key } : {}) })),
      toggle: (kind, id) => {
        const has = get().cart[kind].includes(id);
        set((st) => ({
          cart: { ...st.cart, [kind]: has ? st.cart[kind].filter((x) => x !== id) : [...st.cart[kind], id] },
        }));
        return !has;
      },
      add: (kind, id) =>
        set((st) => (st.cart[kind].includes(id) ? st : { cart: { ...st.cart, [kind]: [...st.cart[kind], id] } })),
      addMany: (items) => {
        let added = 0;
        set((st) => {
          const next = { ...st.cart };
          (Object.keys(items) as ItemKind[]).forEach((k) => {
            for (const id of items[k] ?? []) {
              if (!next[k].includes(id)) {
                next[k] = [...next[k], id];
                added++;
              }
            }
          });
          return { cart: next };
        });
        return added;
      },
      remove: (kind, id) => set((st) => ({ cart: { ...st.cart, [kind]: st.cart[kind].filter((x) => x !== id) } })),
      clearCart: () => set({ cart: emptyCart }),
      reset: () =>
        set({ step: 1, maxStep: 1, mode: null, form: emptyForm, recs: emptyRecs, recsKey: null, recsSource: null, aiProvider: null, cart: emptyCart, refs: [] }),
    }),
    {
      name: "lume-kit-v1",
      version: 2,
      migrate: (state) => {
        const s = state as { form?: Partial<SaasForm> };
        if (s.form) s.form = { ...emptyForm, ...s.form };
        return s as never;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        step: s.step === 5 ? 4 : s.step, // nunca reabre no meio de uma geração
        maxStep: s.maxStep,
        mode: s.mode,
        form: s.form,
        recs: s.recs,
        recsKey: s.recsKey,
        recsSource: s.recsSource,
        aiProvider: s.aiProvider,
        cart: s.cart,
        target: s.target,
        refs: s.refs,
      }),
    },
  ),
);

export function cartCount(cart: Cart) {
  return cart.agent.length + cart.skill.length + cart.mcp.length;
}

/**
 * Origem de cada item do carrinho: sugerido pela IA, pelo recomendador local
 * ou escolhido direto no catálogo (paleta, kit pronto).
 */
export function itemOrigins(
  cart: Cart,
  recs: Recs,
  recsSource: "ia" | "local" | null,
): Record<string, "ia" | "recomendador" | "catalogo"> {
  const out: Record<string, "ia" | "recomendador" | "catalogo"> = {};
  for (const kind of ["agent", "skill", "mcp"] as const) {
    for (const id of cart[kind]) {
      const suggested = recs[kind].some((r) => r.id === id);
      out[`${kind}:${id}`] = suggested ? (recsSource === "local" ? "recomendador" : "ia") : "catalogo";
    }
  }
  return out;
}

/** "7 agentes, 4 skills e 2 MCPs" (omite tipos vazios). */
export function cartSummary(cart: Cart) {
  const parts = [
    cart.agent.length ? `${cart.agent.length} ${cart.agent.length === 1 ? "agente" : "agentes"}` : "",
    cart.skill.length ? `${cart.skill.length} ${cart.skill.length === 1 ? "skill" : "skills"}` : "",
    cart.mcp.length ? `${cart.mcp.length} ${cart.mcp.length === 1 ? "MCP" : "MCPs"}` : "",
  ].filter(Boolean);
  if (parts.length === 0) return "Nenhum item";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

/** Estado de interface que não deve persistir. */
type RecStatus = "idle" | "loading" | "done" | "error";
type UiState = {
  hydrated: boolean;
  cartOpen: boolean;
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  recStatus: Record<ItemKind, RecStatus>;
  recError: string | null;
  activeTab: ItemKind;
  /** Pulso do contador do carrinho a cada item adicionado. */
  cartPulse: number;
  set: (patch: Partial<Omit<UiState, "set">>) => void;
};

export const useUi = create<UiState>()((set) => ({
  hydrated: false,
  cartOpen: false,
  paletteOpen: false,
  shortcutsOpen: false,
  recStatus: { agent: "idle", skill: "idle", mcp: "idle" },
  recError: null,
  activeTab: "agent",
  cartPulse: 0,
  set: (patch) => set(patch),
}));
