"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, KeyRound, LogIn, Plus, ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { useRef } from "react";
import type { ItemKind } from "@/data/catalog/schema";
import type { RecommendedItem } from "@/lib/ai/recommend-core";
import { flyToCart } from "@/lib/client/fly";
import { itemMeta, RISK_META } from "@/lib/item-meta";
import { cn } from "@/lib/utils";
import { useKit } from "@/store/kit-store";

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "brand" | "neutral" | "warn" | "strong"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        tone === "brand" && "bg-brand text-brand-ink",
        tone === "neutral" && "border border-line bg-bg text-ink-2",
        tone === "warn" && "bg-warn-bg text-warn-ink",
        tone === "strong" && "bg-ink text-bg",
        className,
      )}
    >
      {children}
    </span>
  );
}

const RISK_ICON = { leitura: ShieldCheck, escrita: Shield, amplo: ShieldAlert };

export function ItemCard({ kind, rec, index = 0 }: { kind: ItemKind; rec: RecommendedItem; index?: number }) {
  const meta = itemMeta(kind, rec.id);
  const inCart = useKit((s) => s.cart[kind].includes(rec.id));
  const toggle = useKit((s) => s.toggle);
  const btn = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  if (!meta) return null;
  const mcp = meta.mcp;
  const RiskIcon = mcp ? RISK_ICON[mcp.riskLevel] : null;

  return (
    <motion.article
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 3) * 0.04 }}
      aria-labelledby={`card-${kind}-${rec.id}`}
      className={cn(
        "group relative flex flex-col rounded-3xl border bg-bg p-6 transition-[border-color,box-shadow] duration-300 [[data-theme=dark]_&]:bg-surface",
        inCart ? "border-ink shadow-lift [[data-theme=dark]_&]:border-brand/70" : "border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-3">{meta.category}</p>
          <h3 id={`card-${kind}-${rec.id}`} className="mt-1 font-display text-xl font-semibold leading-tight tracking-[-0.015em]">
            {meta.name}
          </h3>
        </div>
        <button
          ref={btn}
          type="button"
          onClick={() => {
            const added = toggle(kind, rec.id);
            if (added) flyToCart(btn.current);
          }}
          aria-pressed={inCart}
          aria-label={inCart ? `Remover ${meta.name} do kit` : `Adicionar ${meta.name} ao kit`}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,transform] duration-200 active:scale-90",
            inCart ? "border-brand bg-brand text-brand-ink" : "border-line-strong text-ink hover:border-ink hover:bg-surface-2",
          )}
        >
          {inCart ? <Check className="size-4" strokeWidth={2.75} /> : <Plus className="size-4" />}
        </button>
      </div>

      <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-2">{meta.description}</p>

      <div className="mt-4 rounded-2xl bg-surface px-4 py-3 [[data-theme=dark]_&]:bg-surface-2">
        <p className="text-xs font-medium text-ink">Por que faz sentido para o seu SaaS</p>
        <p className="mt-1 text-pretty text-sm leading-relaxed text-ink-2">{rec.reason}</p>
      </div>

      {mcp && (
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-ink">O que permite</dt>
            <dd className="mt-1">
              <ul className="space-y-1 text-ink-2">
                {mcp.capabilities.slice(0, 3).map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="mt-2 block size-1 shrink-0 rounded-full bg-ink-3" aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink">Credenciais</dt>
            <dd className="mt-1 flex items-center gap-2 text-ink-2">
              {mcp.auth === "token" ? (
                <>
                  <KeyRound className="size-4 shrink-0" aria-hidden />
                  <span className="font-mono text-xs">{mcp.requiredEnvVars.map((e) => e.name).join(", ")}</span>
                </>
              ) : mcp.auth === "oauth" ? (
                <>
                  <LogIn className="size-4 shrink-0" aria-hidden /> Login pelo navegador (OAuth)
                </>
              ) : (
                <>Nenhuma{mcp.requirements[0] ? `; precisa de ${mcp.requirements[0].split(" ")[0]}` : ""}</>
              )}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
        {rec.impact === "alto" ? <Badge tone="brand">Essencial</Badge> : <Badge>Opcional</Badge>}
        <Badge>Configuração {meta.effort === "avançado" ? "avançada" : meta.effort === "médio" ? "média" : "fácil"}</Badge>
        {mcp && RiskIcon && (
          <Badge tone={RISK_META[mcp.riskLevel].tone === "calm" ? "neutral" : RISK_META[mcp.riskLevel].tone === "warn" ? "warn" : "strong"}>
            <RiskIcon className="size-3.5" aria-hidden />
            {RISK_META[mcp.riskLevel].label}
          </Badge>
        )}
      </div>
    </motion.article>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-3xl border border-line p-6" aria-hidden>
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton mt-3 h-6 w-2/3 rounded-lg" />
      <div className="skeleton mt-4 h-4 w-full rounded" />
      <div className="skeleton mt-2 h-4 w-5/6 rounded" />
      <div className="skeleton mt-5 h-20 w-full rounded-2xl" />
      <div className="mt-5 flex gap-2">
        <div className="skeleton h-6 w-24 rounded-full" />
        <div className="skeleton h-6 w-28 rounded-full" />
      </div>
    </div>
  );
}
