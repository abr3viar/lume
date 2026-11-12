import Link from "next/link";
import { Spark } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="wrap flex min-h-[70dvh] flex-col items-start justify-center py-24">
        <Spark className="size-12 text-ink opacity-40 grayscale" />
        <h1 className="mt-8 font-display text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">Essa página não existe</h1>
        <p className="mt-4 max-w-md text-pretty text-lg text-ink-2">
          O endereço pode ter mudado ou estar escrito errado. Volte para o início e acenda seu kit de lá.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link href="/">Ir para o início</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/montar">Montar meu kit</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
