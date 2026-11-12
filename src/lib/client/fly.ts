"use client";

import { useUi } from "@/store/kit-store";

/**
 * Anima uma faísca saindo do botão até o ícone do carrinho.
 * Sem movimento quando a pessoa prefere menos animação: só pulsa o contador.
 */
export function flyToCart(from: HTMLElement | null) {
  const bump = () => useUi.setState((s) => ({ cartPulse: s.cartPulse + 1 }));
  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!from || !target || reduce) return bump();

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (b.width === 0) return bump();
  const dot = document.createElement("div");
  dot.setAttribute("aria-hidden", "true");
  Object.assign(dot.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - 7}px`,
    top: `${a.top + a.height / 2 - 7}px`,
    width: "14px",
    height: "14px",
    borderRadius: "999px",
    background: "var(--brand)",
    boxShadow: "0 0 0 3px color-mix(in srgb, var(--brand) 35%, transparent), 0 0 18px var(--brand)",
    zIndex: "80",
    pointerEvents: "none",
  });
  document.body.appendChild(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = dot.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) scale(0.9)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0.4 },
    ],
    { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  anim.onfinish = () => {
    dot.remove();
    bump();
  };
}
