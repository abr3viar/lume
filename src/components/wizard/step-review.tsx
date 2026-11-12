"use client";

import { AlertTriangle, Info, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import type { ItemKind } from "@/data/catalog/schema";
import { baseKitInput, buildKitFiles, kitRoot } from "@/lib/kit/build";
import { checkCart } from "@/lib/kit/checks";
import { itemMeta, KIND_LABEL, RISK_META } from "@/lib/item-meta";
import { saasInfoSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { cartCount, formToInput, useKit, useUi } from "@/store/kit-store";
import { PackageExplorer } from "./package-explorer";
import { useStepNext } from "./step-actions";
import { StepFooter, StepHeader } from "./step-header";

const KINDS: ItemKind[] = ["agent", "skill", "mcp"];

export function StepReview() {
  const mode = useKit((s) => s.mode)!;
  const form = useKit((s) => s.form);
  const cart = useKit((s) => s.cart);
  const remove = useKit((s) => s.remove);
  const setStep = useKit((s) => s.setStep);
  const setUi = useUi((s) => s.set);
  const total = cartCount(cart);

  const saas = useMemo(() => saasInfoSchema.safeParse(formToInput(form)), [form]);
  const checks = useMemo(
    () => checkCart({ agents: cart.agent, skills: cart.skill, mcps: cart.mcp }, form.model || undefined),
    [cart, form.model],
  );
  const preview = useMemo(() => {
    if (!saas.success) return null;
    const input = baseKitInput(mode, saas.data, { agents: cart.agent, skills: cart.skill, mcps: cart.mcp });
    return { files: buildKitFiles(input), root: kitRoot(saas.data) };
  }, [saas, mode, cart]);

  const go = () => {
    if (total === 0 || !saas.success) return;
    setStep(5);
  };
  useStepNext(go);

  return (
    <div className="wrap py-12 lg:py-16">
      <StepHeader title="Revise o seu kit">
        Confira o que vai no pacote e veja cada arquivo antes de gerar. Na geração, a IA adapta cada agente e skill ao
        seu SaaS.
      </StepHeader>

      <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
        <div className="grid content-start gap-8">
          <section aria-labelledby="itens-title">
            <h2 id="itens-title" className="mb-3 flex items-baseline justify-between font-semibold">
              Itens <span className="text-sm font-normal tabular-nums text-ink-3">{total}</span>
            </h2>
            {total === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-2">
                {brand.copy.emptyCart}
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setStep(3)}>
                  Ver sugestões
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {KINDS.map((k) =>
                  cart[k].length ? (
                    <div key={k}>
                      <h3 className="mb-1.5 text-xs font-medium text-ink-3">{KIND_LABEL[k].many}</h3>
                      <ul className="divide-y divide-line rounded-2xl border border-line">
                        {cart[k].map((id) => {
                          const m = itemMeta(k, id);
                          if (!m) return null;
                          return (
                            <li key={id} className="flex items-center gap-2 py-2 pl-4 pr-2 text-sm">
                              <span className="flex-1 truncate">{m.name}</span>
                              {m.mcp && <span className="text-xs text-ink-3">{RISK_META[m.mcp.riskLevel].label}</span>}
                              <Button variant="ghost" size="icon-sm" aria-label={`Remover ${m.name}`} onClick={() => remove(k, id)}>
                                <X />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null,
                )}
                <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setUi({ paletteOpen: true })}>
                  Adicionar outro item do catálogo
                </Button>
              </div>
            )}
          </section>

          {checks.length > 0 && (
            <section aria-labelledby="checks-title">
              <h2 id="checks-title" className="mb-3 font-semibold">
                Verificações
              </h2>
              <ul className="grid gap-2">
                {checks.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "flex gap-3 rounded-2xl p-4 text-sm",
                      c.level === "atencao" ? "bg-warn-bg text-warn-ink" : "border border-line bg-surface text-ink-2",
                    )}
                  >
                    {c.level === "atencao" ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-label="Atenção" />
                    ) : (
                      <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-label="Informação" />
                    )}
                    <div>
                      <p className={cn("font-medium", c.level === "info" && "text-ink")}>{c.title}</p>
                      <p className="mt-0.5 text-pretty">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section aria-labelledby="explorer-title" className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="explorer-title" className="font-semibold">
              Explorador do pacote
            </h2>
            <p className="text-xs text-ink-3">Prévia com os modelos base</p>
          </div>
          {preview ? (
            <PackageExplorer files={preview.files} root={preview.root} />
          ) : (
            <p className="rounded-2xl border border-line p-6 text-sm text-ink-2">
              Complete os dados do SaaS para ver a prévia.
              <Button variant="outline" size="sm" className="ml-3" onClick={() => setStep(2)}>
                Completar
              </Button>
            </p>
          )}
        </section>
      </div>

      <StepFooter>
        <Button variant="ghost" onClick={() => setStep(3)}>
          Voltar
        </Button>
        <Button size="lg" onClick={go} disabled={total === 0 || !saas.success}>
          {brand.copy.generate}
        </Button>
      </StepFooter>
    </div>
  );
}
