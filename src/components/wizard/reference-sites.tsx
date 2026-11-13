"use client";

import { Globe, Loader2, Palette, Plus, Type, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SiteReference } from "@/lib/reference/extract";
import { useKit } from "@/store/kit-store";
import { Field, TextInput } from "./fields";

const MAX = 3;

/**
 * Sites que a pessoa acha bonitos. O Lume busca a página pública, extrai fontes, cores, tokens,
 * estrutura e o HTML limpo, e manda tudo no kit para o agente de design estudar.
 */
export function ReferenceSites() {
  const refs = useKit((s) => s.refs);
  const setRefs = useKit((s) => s.setRefs);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    let url = draft.trim();
    if (!url || busy) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (refs.some((r) => r.url.replace(/\/$/, "") === url.replace(/\/$/, ""))) {
      setError("Esse site já está na lista.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json().catch(() => ({}))) as { reference?: SiteReference; error?: string };
      if (!res.ok || !data.reference) throw new Error(data.error ?? "Não conseguimos abrir esse site.");
      setRefs([...useKit.getState().refs, data.reference]);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não conseguimos abrir esse site.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field
      id="f-refs"
      label="Sites que você acha bonitos"
      optional="opcional"
      hint="O Lume lê a página pública, tira as fontes, as cores, a estrutura e o código, e entrega para o agente de design se inspirar. Sem copiar textos ou marca."
      error={error ?? undefined}
    >
      <div className="flex gap-2">
        <TextInput
          id="f-refs"
          type="url"
          inputMode="url"
          value={draft}
          placeholder="https://um-site-que-voce-admira.com"
          disabled={refs.length >= MAX || busy}
          aria-describedby={error ? "f-refs-error" : "f-refs-hint"}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim() || refs.length >= MAX || busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          {busy ? "Lendo" : "Adicionar"}
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {busy ? "Lendo o site" : ""}
      </p>
      {refs.length > 0 && (
        <ul className="grid gap-2" data-testid="referencias">
          {refs.map((r) => (
            <li key={r.url} className="flex items-start gap-3 rounded-2xl border border-line bg-surface/60 p-3 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
                <Globe className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.title || r.url}</p>
                <p className="truncate text-xs text-ink-3">{r.url}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-2">
                  {r.fonts.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Type className="size-3.5 text-ink-3" aria-hidden />
                      {r.fonts.slice(0, 2).join(", ")}
                    </span>
                  )}
                  {r.colors.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Palette className="size-3.5 text-ink-3" aria-hidden />
                      <span className="flex -space-x-1">
                        {r.colors.slice(0, 6).map((c) => (
                          <span key={c} title={c} className="size-3.5 rounded-full ring-2 ring-bg" style={{ background: c }} />
                        ))}
                      </span>
                    </span>
                  )}
                  <span className="text-ink-3">{r.outline.length} seções lidas</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${r.title || r.url}`}
                onClick={() => setRefs(refs.filter((x) => x.url !== r.url))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
