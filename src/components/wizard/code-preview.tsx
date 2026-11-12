"use client";

import { useEffect, useState } from "react";
import type { HighlighterCore } from "shiki/core";

type Lang = "markdown" | "json" | "dotenv";

let highlighter: Promise<HighlighterCore> | null = null;

/** Highlighter com engine JavaScript (sem WASM) e só as linguagens do kit. Carrega na primeira prévia. */
function getHighlighter() {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ]);
    return createHighlighterCore({
      themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark-default.mjs")],
      langs: [import("shiki/langs/markdown.mjs"), import("shiki/langs/json.mjs"), import("shiki/langs/dotenv.mjs")],
      engine: createJavaScriptRegexEngine(),
    });
  })();
  return highlighter;
}

export function langFor(path: string): Lang {
  if (path.endsWith(".json")) return "json";
  if (path.includes(".env")) return "dotenv";
  return "markdown";
}

export function CodePreview({ path, code }: { path: string; code: string }) {
  const [html, setHtml] = useState<{ key: string; html: string } | null>(null);
  const key = `${path}:${code.length}`;

  useEffect(() => {
    let alive = true;
    getHighlighter()
      .then((h) =>
        h.codeToHtml(code, {
          lang: langFor(path),
          themes: { light: "github-light", dark: "github-dark-default" },
          defaultColor: false,
        }),
      )
      .then((out) => alive && setHtml({ key, html: out }))
      .catch(() => alive && setHtml(null));
    return () => {
      alive = false;
    };
  }, [code, path, key]);

  if (html?.key === key) {
    // O HTML vem do Shiki a partir de texto que nós mesmos geramos; o Shiki escapa o conteúdo.
    return <div className="min-w-0" dangerouslySetInnerHTML={{ __html: html.html }} />;
  }
  return (
    <pre className="shiki min-w-0 whitespace-pre-wrap text-ink-2">
      <code>{code}</code>
    </pre>
  );
}
