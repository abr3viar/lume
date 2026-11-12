"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ItemKind } from "@/data/catalog/schema";
import type { RecommendedItem } from "@/lib/ai/recommend-core";
import type { BusinessModel, Mode, SaasInfoInput, SaasStage, TechLevel } from "@/lib/schemas";

export type Step = 1 | 2 | 3 | 4 | 5;

export type SaasForm = {
  name: string;
  description: string;
  niche: string;
  problem: string;
  model: BusinessModel | "";
  stage: SaasStage | "";
  stack: string[];
  goal: string;
  techLevel: TechLevel | "";
};

export const emptyForm: SaasForm = {
  name: "",
  description: "",
  niche: "",
  problem: "",
  model: "",
  stage: "",
  stack: [],
  goal: "",
  techLevel: "",
};

export type Cart = { agent: string[]; skill: string[]; mcp: string[] };
export const emptyCart: Cart = { agent: [], skill: [], mcp: [] };
export type Recs = Record<ItemKind, RecommendedItem[]>;
const emptyRecs: Recs = { agent: [], skill: [], mcp: [] };

export function formToInput(form: SaasForm): SaasInfoInput {
  return {
    name: form.name,
    description: form.description,
    niche: form.niche,
    problem: form.problem,
    model: (form.model || undefined) as BusinessModel,
    stage: form.stage || undefined,
    stack: form.stack,
    goal: form.goal,
    techLevel: form.techLevel || undefined,
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
  cart: Cart;
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
      cart: emptyCart,
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
      reset: () => set({ step: 1, maxStep: 1, mode: null, form: emptyForm, recs: emptyRecs, recsKey: null, cart: emptyCart }),
    }),
    {
      name: "lume-kit-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        step: s.step === 5 ? 4 : s.step, // nunca reabre no meio de uma geração
        maxStep: s.maxStep,
        mode: s.mode,
        form: s.form,
        recs: s.recs,
        recsKey: s.recsKey,
        cart: s.cart,
      }),
    },
  ),
);

export function cartCount(cart: Cart) {
  return cart.agent.length + cart.skill.length + cart.mcp.length;
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
