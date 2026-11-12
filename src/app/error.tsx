"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Spark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Só o identificador do erro; nenhum dado do usuário.
    console.error("[lume] erro de interface", error.digest ?? error.name);
  }, [error]);

  return (
    <main id="conteudo" className="wrap flex min-h-[80dvh] flex-col items-start justify-center py-24" role="alert">
      <Spark className="size-12 text-ink opacity-40 grayscale" />
      <h1 className="mt-8 font-display text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">Faltou luz por aqui</h1>
      <p className="mt-4 max-w-md text-pretty text-lg text-ink-2">
        {brand.copy.genericError} Seu carrinho e suas respostas continuam salvos neste navegador.
      </p>
      <div className="mt-8 flex gap-3">
        <Button size="lg" onClick={reset}>
          Tentar de novo
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/">Ir para o início</Link>
        </Button>
      </div>
    </main>
  );
}
